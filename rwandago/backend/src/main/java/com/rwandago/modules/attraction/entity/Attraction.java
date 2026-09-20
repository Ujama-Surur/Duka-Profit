package com.rwandago.modules.attraction.entity;

import com.rwandago.common.model.BaseEntity;
import com.rwandago.modules.destination.entity.Destination;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "attractions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attraction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 120)
    private String slug;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", length = 60)
    private String category; // NATIONAL_PARK, MUSEUM, CULTURAL_SITE, HIKING, WATERFALL, VIEWPOINT

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "opening_hours", length = 200)
    private String openingHours;

    @Column(name = "entry_price_usd", precision = 10, scale = 2)
    private BigDecimal entryPriceUsd;

    @Column(name = "entry_price_rwf", precision = 12, scale = 2)
    private BigDecimal entryPriceRwf;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "website", length = 250)
    private String website;

    @Column(name = "recommended_duration_hours")
    private Double recommendedDurationHours;

    @Column(name = "accessibility_info", columnDefinition = "TEXT")
    private String accessibilityInfo;

    @Column(name = "safety_info", columnDefinition = "TEXT")
    private String safetyInfo;

    @Builder.Default
    @Column(name = "is_verified", nullable = false)
    private boolean isVerified = true;
}
