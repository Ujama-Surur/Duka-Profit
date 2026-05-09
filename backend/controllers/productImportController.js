const csv = require('csv-parser');
const { Readable } = require('stream');
const Product = require('../models/Product');

const parseCsvBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

const importProductsCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required.' });
    }

    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : {};
    const replaceExisting = req.body.replaceExisting === 'true';
    const skipDuplicates = req.body.skipDuplicates === 'true';

    const getMappedValue = (row, key) => {
      const mappedHeader = mapping[key];
      if (mappedHeader && row[mappedHeader] !== undefined) return row[mappedHeader];
      return row[key];
    };

    const rows = await parseCsvBuffer(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({ message: 'No records found in CSV file.' });
    }

    const userId = req.user._id;
    const failedRecords = [];
    const validRecords = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const nameRaw = getMappedValue(row, 'name');
      const priceRaw = getMappedValue(row, 'price');
      const barcodeRaw = getMappedValue(row, 'barcode');
      const quantityRaw = getMappedValue(row, 'quantity');
      const expiryRaw = getMappedValue(row, 'expiryDate');

      const name = String(nameRaw || '').trim();
      const price = Number(priceRaw);
      const barcode = String(barcodeRaw || '').trim();
      const quantity = quantityRaw === undefined || quantityRaw === '' ? 0 : Number(quantityRaw);

      let expiryDate;
      if (expiryRaw !== undefined && String(expiryRaw).trim() !== '') {
        const parsedDate = new Date(expiryRaw);
        if (Number.isNaN(parsedDate.getTime())) {
          failedRecords.push({ row: rowNumber, name, barcode, error: 'Invalid expiryDate format' });
          return;
        }
        expiryDate = parsedDate;
      }

      if (!name) {
        failedRecords.push({ row: rowNumber, name, barcode, error: 'name is required' });
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        failedRecords.push({ row: rowNumber, name, barcode, error: 'price must be a positive number' });
        return;
      }
      if (!Number.isFinite(quantity) || quantity < 0) {
        failedRecords.push({ row: rowNumber, name, barcode, error: 'quantity must be a non-negative number' });
        return;
      }

      validRecords.push({
        row: rowNumber,
        name,
        price,
        barcode: barcode || undefined,
        quantity: Math.floor(quantity),
        expiryDate,
      });
    });

    const barcodes = [...new Set(validRecords.filter((r) => r.barcode).map((r) => r.barcode))];
    const existingByBarcode = new Map();
    if (barcodes.length) {
      const existing = await Product.find({
        userId,
        barcode: { $in: barcodes },
        isActive: true,
      }).select('_id barcode');
      existing.forEach((p) => existingByBarcode.set(p.barcode, p));
    }

    const createDocs = [];
    const updateOps = [];
    let skippedCount = 0;

    for (const record of validRecords) {
      const existing = record.barcode ? existingByBarcode.get(record.barcode) : null;

      if (existing) {
        if (skipDuplicates && !replaceExisting) {
          skippedCount += 1;
          failedRecords.push({ row: record.row, name: record.name, barcode: record.barcode, error: 'Duplicate barcode skipped' });
          continue;
        }
        if (replaceExisting) {
          const setPayload = {
            productName: record.name,
            sellingPrice: record.price,
            costPrice: 0,
            quantity: record.quantity,
            stock: record.quantity,
            ...(record.expiryDate ? { expirationDate: record.expiryDate, category: 'food' } : { category: 'other' }),
          };
          updateOps.push({
            updateOne: {
              filter: { _id: existing._id, userId },
              update: {
                $set: setPayload,
                ...(record.expiryDate ? {} : { $unset: { expirationDate: 1 } }),
              },
            },
          });
          continue;
        }

        failedRecords.push({ row: record.row, name: record.name, barcode: record.barcode, error: 'Duplicate barcode exists' });
        continue;
      }

      createDocs.push({
        userId,
        productName: record.name,
        sellingPrice: record.price,
        costPrice: 0,
        quantity: record.quantity,
        stock: record.quantity,
        category: record.expiryDate ? 'food' : 'other',
        ...(record.barcode ? { barcode: record.barcode } : {}),
        ...(record.expiryDate ? { expirationDate: record.expiryDate } : {}),
      });
    }

    let createdCount = 0;
    let updatedCount = 0;

    if (createDocs.length) {
      try {
        const inserted = await Product.insertMany(createDocs, { ordered: false });
        createdCount = inserted.length;
      } catch (error) {
        createdCount = error.insertedDocs?.length || 0;
        (error.writeErrors || []).forEach((writeError) => {
          const doc = createDocs[writeError.index];
          failedRecords.push({
            row: validRecords.find((r) => r.name === doc.productName && r.barcode === doc.barcode)?.row || null,
            name: doc.productName,
            barcode: doc.barcode,
            error: writeError.errmsg || 'Failed to insert product',
          });
        });
      }
    }

    if (updateOps.length) {
      const result = await Product.bulkWrite(updateOps, { ordered: false });
      updatedCount = result.modifiedCount || 0;
    }

    const successfullyImported = createdCount + updatedCount;
    res.json({
      success: true,
      totalRecords: rows.length,
      validRecords: validRecords.length,
      successfullyImported,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount: failedRecords.length,
      failedRecords,
      options: { replaceExisting, skipDuplicates },
    });
  } catch (err) {
    console.error('Import error:', err);
    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid column mapping payload.' });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to import products',
    });
  }
};

module.exports = { importProductsCsv };
