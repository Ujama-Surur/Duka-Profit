package com.rwandago.modules.destination.dto;

import com.rwandago.modules.destination.entity.Destination;
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
public class DestinationDto {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String province;
    private String district;
    private Double latitude;
    private Double longitude;
    private String coverImageUrl;
    private Integer recommendedDurationDays;
    private BigDecimal estimatedDailyBudgetUsd;
    private String bestTimeToVisit;
    private String travelTips;
    private boolean isFeatured;

    public static DestinationDto fromEntity(Destination destination) {
        return DestinationDto.builder()
                .id(destination.getId())
                .name(destination.getName())
                .slug(destination.getSlug())
                .description(destination.getDescription())
                .province(destination.getProvince())
                .district(destination.getDistrict())
                .latitude(destination.getLatitude())
                .longitude(destination.getLongitude())
                .coverImageUrl(destination.getCoverImageUrl())
                .recommendedDurationDays(destination.getRecommendedDurationDays())
                .estimatedDailyBudgetUsd(destination.getEstimatedDailyBudgetUsd())
                .bestTimeToVisit(destination.getBestTimeToVisit())
                .travelTips(destination.getTravelTips())
                .isFeatured(destination.isFeatured())
                .build();
    }
}
