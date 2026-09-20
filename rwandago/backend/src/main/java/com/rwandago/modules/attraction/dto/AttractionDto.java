package com.rwandago.modules.attraction.dto;

import com.rwandago.modules.attraction.entity.Attraction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttractionDto {
    private UUID id;
    private UUID destinationId;
    private String destinationName;
    private String destinationSlug;
    private String name;
    private String slug;
    private String description;
    private String category;
    private Double latitude;
    private Double longitude;
    private String coverImageUrl;
    private String openingHours;
    private BigDecimal entryPriceUsd;
    private BigDecimal entryPriceRwf;
    private String contactPhone;
    private String website;
    private Double recommendedDurationHours;
    private String accessibilityInfo;
    private String safetyInfo;
    private boolean isVerified;

    public static AttractionDto fromEntity(Attraction attraction) {
        return AttractionDto.builder()
                .id(attraction.getId())
                .destinationId(attraction.getDestination() != null ? attraction.getDestination().getId() : null)
                .destinationName(attraction.getDestination() != null ? attraction.getDestination().getName() : null)
                .destinationSlug(attraction.getDestination() != null ? attraction.getDestination().getSlug() : null)
                .name(attraction.getName())
                .slug(attraction.getSlug())
                .description(attraction.getDescription())
                .category(attraction.getCategory())
                .latitude(attraction.getLatitude())
                .longitude(attraction.getLongitude())
                .coverImageUrl(attraction.getCoverImageUrl())
                .openingHours(attraction.getOpeningHours())
                .entryPriceUsd(attraction.getEntryPriceUsd())
                .entryPriceRwf(attraction.getEntryPriceRwf())
                .contactPhone(attraction.getContactPhone())
                .website(attraction.getWebsite())
                .recommendedDurationHours(attraction.getRecommendedDurationHours())
                .accessibilityInfo(attraction.getAccessibilityInfo())
                .safetyInfo(attraction.getSafetyInfo())
                .isVerified(attraction.isVerified())
                .build();
    }
}
