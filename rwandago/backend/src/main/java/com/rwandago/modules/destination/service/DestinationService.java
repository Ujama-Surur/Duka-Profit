package com.rwandago.modules.destination.service;

import com.rwandago.modules.destination.dto.DestinationDto;

import java.util.List;

public interface DestinationService {
    List<DestinationDto> getAllDestinations();
    List<DestinationDto> getFeaturedDestinations();
    DestinationDto getDestinationBySlug(String slug);
}
