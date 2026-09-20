package com.rwandago.modules.attraction.controller;

import com.rwandago.common.dto.ApiResponse;
import com.rwandago.modules.attraction.dto.AttractionDto;
import com.rwandago.modules.attraction.service.AttractionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attractions")
@RequiredArgsConstructor
@Tag(name = "Attractions", description = "Endpoints for discovering natural wonders, national parks, and cultural sites")
public class AttractionController {

    private final AttractionService attractionService;

    @GetMapping
    @Operation(summary = "Get all tourist attractions across Rwanda")
    public ResponseEntity<ApiResponse<List<AttractionDto>>> getAllAttractions(
            @RequestParam(required = false) UUID destinationId) {
        List<AttractionDto> attractions;
        if (destinationId != null) {
            attractions = attractionService.getAttractionsByDestination(destinationId);
        } else {
            attractions = attractionService.getAllAttractions();
        }
        return ResponseEntity.ok(ApiResponse.success(attractions));
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get detailed attraction information by unique slug")
    public ResponseEntity<ApiResponse<AttractionDto>> getAttractionBySlug(@PathVariable String slug) {
        AttractionDto attraction = attractionService.getAttractionBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(attraction));
    }
}
