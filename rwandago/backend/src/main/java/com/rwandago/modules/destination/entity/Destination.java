package com.rwandago.modules.destination.entity;

import com.rwandago.common.model.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "destinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Destination extends BaseEntity {

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "province", length = 60)
    private String province;

    @Column(name = "district", length = 60)
    private String district;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "recommended_duration_days")
    private Integer recommendedDurationDays;

    @Column(name = "estimated_daily_budget_usd", precision = 10, scale = 2)
    private BigDecimal estimatedDailyBudgetUsd;

    @Column(name = "best_time_to_visit", length = 200)
    private String bestTimeToVisit;

    @Column(name = "travel_tips", columnDefinition = "TEXT")
    private String travelTips;

    @Builder.Default
    @Column(name = "is_featured", nullable = false)
    private boolean isFeatured = false;

    @Builder.Default
    @Column(name = "is_published", nullable = false)
    private boolean isPublished = true;
}
