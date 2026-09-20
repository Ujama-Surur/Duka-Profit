package com.rwandago.modules.attraction.repository;

import com.rwandago.modules.attraction.entity.Attraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttractionRepository extends JpaRepository<Attraction, UUID> {
    Optional<Attraction> findBySlugAndIsDeletedFalse(String slug);
    List<Attraction> findAllByDestinationIdAndIsDeletedFalse(UUID destinationId);
    List<Attraction> findAllByIsDeletedFalse();
    boolean existsBySlug(String slug);
}
