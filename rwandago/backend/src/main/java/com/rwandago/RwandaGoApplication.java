package com.rwandago;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
public class RwandaGoApplication {

    public static void main(String[] args) {
        SpringApplication.run(RwandaGoApplication.class, args);
    }
}
