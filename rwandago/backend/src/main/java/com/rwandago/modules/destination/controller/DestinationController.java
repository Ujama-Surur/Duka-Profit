package com.rwandago.modules.destination.controller;

import com.rwandago.common.dto.ApiResponse;
import com.rwandago.modules.destination.dto.DestinationDto;
import com.rwandago.modules.destination.service.DestinationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/destinations")
@RequiredArgsConstructor
@Tag(name = "Destinations", description = "Endpoints for discovering Rwandan destinations, cities, and national regions")
public class DestinationController {

    private final DestinationService destinationService;

    @GetMapping
    @Operation(summary = "Get all published destinations in Rwanda")
    public ResponseEntity<ApiResponse<List<DestinationDto>>> getAllDestinations() {
        List<DestinationDto> destinations = destinationService.getAllDestinations();
        return ResponseEntity.ok(ApiResponse.success(destinations));
    }

    @GetMapping("/featured")
    @Operation(summary = "Get top featured destinations for homepage")
    public ResponseEntity<ApiResponse<List<DestinationDto>>> getFeaturedDestinations() {
        List<DestinationDto> destinations = destinationService.getFeaturedDestinations();
        return ResponseEntity.ok(ApiResponse.success(destinations));
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get detailed destination information by unique slug")
    public ResponseEntity<ApiResponse<DestinationDto>> getDestinationBySlug(@PathVariable String slug) {
        DestinationDto destination = destinationService.getDestinationBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(destination));
    }
}
