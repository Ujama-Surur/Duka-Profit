package com.rwandago.modules.attraction.service;

import com.rwandago.common.exception.ResourceNotFoundException;
import com.rwandago.modules.attraction.dto.AttractionDto;
import com.rwandago.modules.attraction.entity.Attraction;
import com.rwandago.modules.attraction.repository.AttractionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttractionServiceImpl implements AttractionService {

    private final AttractionRepository attractionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AttractionDto> getAllAttractions() {
        return attractionRepository.findAllByIsDeletedFalse()
                .stream()
                .map(AttractionDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttractionDto> getAttractionsByDestination(UUID destinationId) {
        return attractionRepository.findAllByDestinationIdAndIsDeletedFalse(destinationId)
                .stream()
                .map(AttractionDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AttractionDto getAttractionBySlug(String slug) {
        Attraction attraction = attractionRepository.findBySlugAndIsDeletedFalse(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Attraction not found with slug: " + slug));
        return AttractionDto.fromEntity(attraction);
    }
}
