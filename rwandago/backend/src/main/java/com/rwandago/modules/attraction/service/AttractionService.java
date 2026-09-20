package com.rwandago.modules.attraction.service;

import com.rwandago.modules.attraction.dto.AttractionDto;

import java.util.List;
import java.util.UUID;

public interface AttractionService {
    List<AttractionDto> getAllAttractions();
    List<AttractionDto> getAttractionsByDestination(UUID destinationId);
    AttractionDto getAttractionBySlug(String slug);
}
