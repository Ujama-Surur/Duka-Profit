package com.rwandago.seed;

import com.rwandago.modules.attraction.entity.Attraction;
import com.rwandago.modules.attraction.repository.AttractionRepository;
import com.rwandago.modules.destination.entity.Destination;
import com.rwandago.modules.destination.repository.DestinationRepository;
import com.rwandago.modules.user.entity.Role;
import com.rwandago.modules.user.entity.RoleEnum;
import com.rwandago.modules.user.entity.User;
import com.rwandago.modules.user.repository.RoleRepository;
import com.rwandago.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final DestinationRepository destinationRepository;
    private final AttractionRepository attractionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking RwandaGo database seeding state...");
        seedRoles();
        seedUsers();
        seedDestinationsAndAttractions();
        log.info("RwandaGo database initialized successfully.");
    }

    private void seedRoles() {
        for (RoleEnum roleEnum : RoleEnum.values()) {
            if (roleRepository.findByName(roleEnum).isEmpty()) {
                Role role = Role.builder()
                        .name(roleEnum)
                        .description("System role: " + roleEnum.name())
                        .build();
                roleRepository.save(role);
                log.info("Seeded role: {}", roleEnum);
            }
        }
    }

    private void seedUsers() {
        Role adminRole = roleRepository.findByName(RoleEnum.ROLE_ADMIN).orElseThrow();
        Role superAdminRole = roleRepository.findByName(RoleEnum.ROLE_SUPER_ADMIN).orElseThrow();
        Role businessRole = roleRepository.findByName(RoleEnum.ROLE_BUSINESS_OWNER).orElseThrow();
        Role userRole = roleRepository.findByName(RoleEnum.ROLE_USER).orElseThrow();

        // 1. Super Admin
        if (userRepository.findByEmail("admin@rwandago.rw").isEmpty()) {
            User admin = User.builder()
                    .email("admin@rwandago.rw")
                    .passwordHash(passwordEncoder.encode("AdminRwandaGo2026!"))
                    .firstName("System")
                    .lastName("Administrator")
                    .phone("+250788100001")
                    .country("Rwanda")
                    .roles(new HashSet<>(Arrays.asList(adminRole, superAdminRole)))
                    .isActive(true)
                    .isVerified(true)
                    .build();
            userRepository.save(admin);
            log.info("Seeded administrator account: admin@rwandago.rw");
        }

        // 2. Business Partner
        if (userRepository.findByEmail("partner@rwandago.rw").isEmpty()) {
            User partner = User.builder()
                    .email("partner@rwandago.rw")
                    .passwordHash(passwordEncoder.encode("PartnerRwandaGo2026!"))
                    .firstName("Jean-Paul")
                    .lastName("Mugabo")
                    .phone("+250788200002")
                    .country("Rwanda")
                    .roles(new HashSet<>(Collections.singletonList(businessRole)))
                    .isActive(true)
                    .isVerified(true)
                    .build();
            userRepository.save(partner);
            log.info("Seeded verified business owner account: partner@rwandago.rw");
        }

        // 3. Traveler
        if (userRepository.findByEmail("traveler@rwandago.rw").isEmpty()) {
            User traveler = User.builder()
                    .email("traveler@rwandago.rw")
                    .passwordHash(passwordEncoder.encode("TravelerRwandaGo2026!"))
                    .firstName("Elena")
                    .lastName("Vance")
                    .phone("+14155552671")
                    .country("Canada")
                    .roles(new HashSet<>(Collections.singletonList(userRole)))
                    .isActive(true)
                    .isVerified(true)
                    .build();
            userRepository.save(traveler);
            log.info("Seeded traveler account: traveler@rwandago.rw");
        }
    }

    private void seedDestinationsAndAttractions() {
        if (destinationRepository.count() > 0) {
            return;
        }

        // 1. Kigali
        Destination kigali = destinationRepository.save(Destination.builder()
                .name("Kigali")
                .slug("kigali")
                .province("Kigali City")
                .district("Gasabo, Nyarugenge, Kicukiro")
                .latitude(-1.9441)
                .longitude(30.0619)
                .coverImageUrl("https://images.unsplash.com/photo-1609198092458-38a293c7ac4b?auto=format&fit=crop&w=1200&q=80")
                .recommendedDurationDays(3)
                .estimatedDailyBudgetUsd(BigDecimal.valueOf(75.00))
                .bestTimeToVisit("Year-round; June to September for dry sunny days")
                .travelTips("Extremely clean, safe, and easily navigable by Moto or taxi apps. Plastic bags are strictly prohibited in Rwanda.")
                .description("Rwanda's vibrant capital city is famed for its cleanliness, rolling green hills, blooming art scene, specialty coffee bars, and poignant memorials.")
                .isFeatured(true)
                .isPublished(true)
                .build());

        // 2. Musanze (Volcanoes)
        Destination musanze = destinationRepository.save(Destination.builder()
                .name("Musanze & Volcanoes")
                .slug("musanze")
                .province("Northern Province")
                .district("Musanze")
                .latitude(-1.4998)
                .longitude(29.6350)
                .coverImageUrl("https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=1200&q=80")
                .recommendedDurationDays(3)
                .estimatedDailyBudgetUsd(BigDecimal.valueOf(180.00))
                .bestTimeToVisit("December to February and June to September")
                .travelTips("Bring waterproof trekking boots, gaiters, and layered rain gear for mountain gorilla expeditions.")
                .description("The gateway to Volcanoes National Park, where misty peaks harbor endangered mountain gorillas, golden monkeys, and lush bamboo forests.")
                .isFeatured(true)
                .isPublished(true)
                .build());

        // 3. Rubavu / Gisenyi (Lake Kivu)
        Destination rubavu = destinationRepository.save(Destination.builder()
                .name("Rubavu & Lake Kivu")
                .slug("rubavu")
                .province("Western Province")
                .district("Rubavu")
                .latitude(-1.6744)
                .longitude(29.2562)
                .coverImageUrl("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80")
                .recommendedDurationDays(2)
                .estimatedDailyBudgetUsd(BigDecimal.valueOf(85.00))
                .bestTimeToVisit("Dry seasons (June - August & December - January)")
                .travelTips("Lake Kivu has no hippos, crocodiles, or bilharzia, making it entirely safe for swimming and kayaking.")
                .description("A historic resort town perched on the sandy northern shores of Lake Kivu, offering water sports, fresh Sambaza fish, and mountain vistas.")
                .isFeatured(true)
                .isPublished(true)
                .build());

        // 4. Akagera
        Destination akagera = destinationRepository.save(Destination.builder()
                .name("Akagera National Park Area")
                .slug("akagera")
                .province("Eastern Province")
                .district("Kayonza, Gatsibo, Nyagatare")
                .latitude(-1.8800)
                .longitude(30.7000)
                .coverImageUrl("https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80")
                .recommendedDurationDays(2)
                .estimatedDailyBudgetUsd(BigDecimal.valueOf(140.00))
                .bestTimeToVisit("June to October (dry season, best wildlife viewing around water holes)")
                .travelTips("Early morning game drives starting at 06:00 AM give the best chance to spot lions and leopards.")
                .description("Central Africa's largest protected wetland, blending undulating savannas, papyrus swamps, and lakes with the Big Five: lions, leopards, rhinos, elephants, and buffalos.")
                .isFeatured(true)
                .isPublished(true)
                .build());

        // 5. Nyungwe Forest
        Destination nyungwe = destinationRepository.save(Destination.builder()
                .name("Nyungwe Rainforest")
                .slug("nyungwe")
                .province("Western / Southern Province")
                .district("Rusizi, Nyamagabe")
                .latitude(-2.4833)
                .longitude(29.2000)
                .coverImageUrl("https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80")
                .recommendedDurationDays(3)
                .estimatedDailyBudgetUsd(BigDecimal.valueOf(150.00))
                .bestTimeToVisit("Year-round for canopy walks; October to May for chimpanzee sightings")
                .travelTips("The canopy walkway is 70 meters high; wear secure footwear and keep camera straps looped.")
                .description("One of Africa's oldest montane rainforests, rich in biodiversity with 13 primate species, 300+ bird species, and an exhilarating suspended canopy walkway.")
                .isFeatured(true)
                .isPublished(true)
                .build());

        // Seed Attractions
        attractionRepository.save(Attraction.builder()
                .destination(musanze)
                .name("Volcanoes National Park Gorilla Sanctuary")
                .slug("volcanoes-national-park")
                .category("NATIONAL_PARK")
                .latitude(-1.4700)
                .longitude(29.5300)
                .coverImageUrl("https://images.unsplash.com/photo-1547970810-dc1eac816167?auto=format&fit=crop&w=1200&q=80")
                .openingHours("06:00 - 17:00 Daily")
                .entryPriceUsd(BigDecimal.valueOf(1500.00))
                .entryPriceRwf(BigDecimal.valueOf(1980000.00))
                .contactPhone("+250788123456")
                .website("https://visitrwanda.com/destinations/volcanoes-national-park/")
                .recommendedDurationHours(6.0)
                .accessibilityInfo("Requires moderate to high physical fitness due to dense mountain vegetation and elevation.")
                .safetyInfo("Strict 10-meter distance maintained from primates; guided by armed professional park rangers.")
                .isVerified(true)
                .description("Home of the mountain gorillas made famous by Dian Fossey. An intimate wildlife encounter unlike anywhere else on earth.")
                .build());

        attractionRepository.save(Attraction.builder()
                .destination(kigali)
                .name("Kigali Genocide Memorial")
                .slug("kigali-genocide-memorial")
                .category("MUSEUM")
                .latitude(-1.9304)
                .longitude(30.0594)
                .coverImageUrl("https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80")
                .openingHours("08:00 - 17:00 (Last entry 16:00)")
                .entryPriceUsd(BigDecimal.ZERO)
                .entryPriceRwf(BigDecimal.ZERO)
                .contactPhone("+250788303098")
                .website("https://kgm.rw")
                .recommendedDurationHours(2.5)
                .accessibilityInfo("Fully wheelchair accessible with paved paths, ramps, and audio guide options.")
                .safetyInfo("Quiet and respectful demeanor expected throughout exhibitions and gardens of reflection.")
                .isVerified(true)
                .description("A place of remembrance, education, and peace honoring the victims of the 1994 genocide against the Tutsi.")
                .build());

        attractionRepository.save(Attraction.builder()
                .destination(nyungwe)
                .name("Nyungwe Canopy Walkway")
                .slug("nyungwe-canopy-walkway")
                .category("ADVENTURE")
                .latitude(-2.4789)
                .longitude(29.2432)
                .coverImageUrl("https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80")
                .openingHours("08:00 - 15:00")
                .entryPriceUsd(BigDecimal.valueOf(40.00))
                .entryPriceRwf(BigDecimal.valueOf(52800.00))
                .contactPhone("+250788998877")
                .website("https://visitrwanda.com/destinations/nyungwe-national-park/")
                .recommendedDurationHours(3.0)
                .accessibilityInfo("Requires walking 2 hours on natural forest trails before reaching the suspended bridge.")
                .safetyInfo("Engineered metal suspension bridge with high protective wire mesh; safe for all non-vertigo visitors.")
                .isVerified(true)
                .description("Suspended 70 meters above the forest floor, offering breathtaking panoramic views of ancient treetops and wildlife.")
                .build());

        attractionRepository.save(Attraction.builder()
                .destination(akagera)
                .name("Akagera Big Five Safari")
                .slug("akagera-safari")
                .category("NATIONAL_PARK")
                .latitude(-1.8700)
                .longitude(30.7100)
                .coverImageUrl("https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80")
                .openingHours("06:00 - 18:00")
                .entryPriceUsd(BigDecimal.valueOf(100.00))
                .entryPriceRwf(BigDecimal.valueOf(132000.00))
                .contactPhone("+250788545454")
                .website("https://www.africanparks.org/the-parks/akagera")
                .recommendedDurationHours(8.0)
                .accessibilityInfo("Conducted entirely in 4x4 safari vehicles; suitable for all age groups.")
                .safetyInfo("Stay inside vehicle at all times except designated picnic and campsite spots.")
                .isVerified(true)
                .description("A breathtaking savanna wilderness teeming with elephants, lions, giraffes, zebras, and white rhinos.")
                .build());

        attractionRepository.save(Attraction.builder()
                .destination(kigali)
                .name("Inzora Rooftop Cafe & Bookshop")
                .slug("inzora-rooftop")
                .category("CULTURAL_SITE")
                .latitude(-1.9540)
                .longitude(30.0910)
                .coverImageUrl("https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80")
                .openingHours("08:30 - 18:30")
                .entryPriceUsd(BigDecimal.ZERO)
                .entryPriceRwf(BigDecimal.ZERO)
                .contactPhone("+250788334455")
                .website("https://www.inzoracafe.com")
                .recommendedDurationHours(1.5)
                .accessibilityInfo("Staircase access to rooftop terrace.")
                .safetyInfo("Safe and tranquil neighborhood in Kacyiru.")
                .isVerified(true)
                .description("Perched atop Ikirezi Bookshop in Kacyiru, offering exquisite Rwandan specialty coffee, fresh pastries, and sunset views.")
                .build());
    }
}
