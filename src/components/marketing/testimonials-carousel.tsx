"use client";

import Image from "next/image";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Ange",
    text: "J'avais déjà mon admission mais je ne savais plus comment organiser toute la suite. AVI CERTIFY m'a accompagné étape par étape jusqu'au dossier visa et à la préparation du départ.",
    image: "/assets/photos/student-at-university.jpg",
  },
  {
    name: "Géraldine",
    text: "Ce qui m'a rassurée, c'est l'équipe humaine derrière la plateforme. On ne se sent pas seule. Chaque document était vérifié et expliqué.",
    image: "/assets/photos/beautifull-african-student-landed-france.jpg",
  },
  {
    name: "Naomi",
    text: "L'attestation AVI et les démarches administratives ont été traitées rapidement. J'ai apprécié la disponibilité et le suivi personnalisé.",
    image: "/assets/photos/student-at-residen-university.jpg",
  },
  {
    name: "Johanna",
    text: "Le paiement de mes frais d'admission a été géré rapidement et j'ai enfin pu avancer sereinement avec mon école.",
    image: "/assets/photos/young-african-student-arrive-france.jpg",
  },
  {
    name: "Elysée",
    text: "AVI CERTIFY m'a aidé à mieux comprendre les démarches Campus France et le dossier consulaire. Cela a réduit énormément mon stress.",
    image: "/assets/photos/student-graduated.jpg",
  },
];

export function TestimonialsCarousel() {
  return (
    <section className="overflow-hidden border-y bg-gradient-to-br from-muted/30 to-accent/5 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Témoignages
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ils ont préparé leur mobilité avec AVI CERTIFY
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Des parcours réels, accompagnés avec rigueur, écoute et suivi humain
          </p>
        </div>

        <div className="relative mt-12">
          <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-muted/30 to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-muted/30 to-transparent" />

          <div className="flex gap-6 py-8 testimonials-scroll">
            {testimonials.concat(testimonials).map((testimonial, index) => (
              <div
                key={`${testimonial.name}-${index}`}
                className="w-[380px] shrink-0 rounded-lg border bg-background p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <Quote className="h-8 w-8 text-accent/20" aria-hidden="true" />
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {testimonial.text}
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-accent/20 shadow-sm">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Étudiant accompagné
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
