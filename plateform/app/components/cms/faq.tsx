import type { ReactNode } from "react";

export type Question = { icon: string; question: string; answer: string };

// Titre, introduction et questions/réponses illustrées d'un pictogramme, pilotés par le CMS.
export default function Faq({ title, intro, questions }: { title: ReactNode; intro?: ReactNode; questions: Question[] }) {
  return (
    <section className="fr-container flex flex-col gap-6 lg:flex-row lg:justify-between lg:gap-12">
      <div className="lg:max-w-107">
        <h2 className="fr-h2 mb-4!">{title}</h2>
        {intro && <p className="fr-text--lg mb-0!">{intro}</p>}
      </div>

      <ul role="list" className="m-0! grid list-none! grid-cols-1 gap-6 p-0! md:grid-cols-2 md:gap-x-11.5 md:gap-y-8 lg:max-w-163">
        {questions.map((item) => (
          <li key={item.question} className="flex gap-2 p-0! md:flex-col">
            <div className="bg-blue-ecume-975 flex size-12 shrink-0 items-center justify-center rounded-full">
              <img src={item.icon} alt="" aria-hidden="true" className="size-8 dark:rounded-full dark:bg-white" />
            </div>
            <div>
              <h3 className="fr-h6 mb-2!">{item.question}</h3>
              <p className="mb-0!">{item.answer}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
