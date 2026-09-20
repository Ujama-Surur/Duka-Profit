package com.rwandago.modules.destination.repository;

import com.rwandago.modules.destination.entity.Destination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DestinationRepository extends JpaRepository<Destination, UUID> {
    Optional<Destination> findBySlugAndIsDeletedFalse(String slug);
    List<Destination> findAllByIsPublishedTrueAndIsDeletedFalse();
    List<Destination> findAllByIsFeaturedTrueAndIsPublishedTrueAndIsDeletedFalse();
    boolean existsBySlug(String slug);
}
