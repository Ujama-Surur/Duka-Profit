package com.rwandago.modules.destination.service;

import com.rwandago.common.exception.ResourceNotFoundException;
import com.rwandago.modules.destination.dto.DestinationDto;
import com.rwandago.modules.destination.entity.Destination;
import com.rwandago.modules.destination.repository.DestinationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DestinationServiceImpl implements DestinationService {

    private final DestinationRepository destinationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DestinationDto> getAllDestinations() {
        return destinationRepository.findAllByIsPublishedTrueAndIsDeletedFalse()
                .stream()
                .map(DestinationDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DestinationDto> getFeaturedDestinations() {
        return destinationRepository.findAllByIsFeaturedTrueAndIsPublishedTrueAndIsDeletedFalse()
                .stream()
                .map(DestinationDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DestinationDto getDestinationBySlug(String slug) {
        Destination destination = destinationRepository.findBySlugAndIsDeletedFalse(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Destination not found with slug: " + slug));
        return DestinationDto.fromEntity(destination);
    }
}
