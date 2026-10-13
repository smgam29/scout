export type Project = {
  id: string;
  title: string;
  task: string;
  imageCount: number;
  prompts: string[];
  hints: string[];
  source: "starter" | "model";
  notice: string | null;
};

export type ProjectTemplate = Omit<Project, "notice" | "source">;

export const STARTERS: ProjectTemplate[] = [
  {
    id: "sea-animals",
    title: "Sea animals",
    task: "Research sea animals and create 3 images that show what you learned.",
    imageCount: 3,
    prompts: [
      "What is one sea animal that lives in the deep ocean?",
      "How does a sea turtle breathe?",
      "Help me write a short note about dolphins.",
      "What should my first picture show?",
    ],
    hints: [
      "A sea turtle coming up for air",
      "A pod of dolphins near the surface",
      "An anglerfish with its light in dark water",
    ],
  },
  {
    id: "weather-watch",
    title: "Weather watch",
    task: "Research rain, clouds, and wind. Create 3 images that show what you learned.",
    imageCount: 3,
    prompts: [
      "How do clouds make rain?",
      "What makes the wind blow?",
      "Help me write a short note about storms.",
      "What should my first picture show?",
    ],
    hints: [
      "A dark cloud dropping rain on a field",
      "Wind pushing a kite in a bright sky",
      "A simple diagram of a cloud made of tiny drops",
    ],
  },
  {
    id: "sky-neighbors",
    title: "Moon, Sun, and a planet",
    task: "Research the Moon, the Sun, and one planet. Create 3 images that show what you learned.",
    imageCount: 3,
    prompts: [
      "How is the Moon different from the Sun?",
      "What is one planet I could study?",
      "Help me write a short note about that planet.",
      "What should my first picture show?",
    ],
    hints: [
      "The Moon with gray craters in a dark sky",
      "The Sun shining on the Earth",
      "One planet with its main colors and rings or moons",
    ],
  },
  {
    id: "animal-homes",
    title: "Animal homes",
    task: "Research three animal homes, such as a nest, a burrow, and a hive. Create 3 images that show what you learned.",
    imageCount: 3,
    prompts: [
      "Why do birds build nests?",
      "What animal lives in a burrow?",
      "Help me write a short note about bees.",
      "What should my first picture show?",
    ],
    hints: [
      "A bird nest with eggs in a tree",
      "A rabbit burrow under the grass",
      "A honeycomb with bees at the entrance",
    ],
  },
  {
    id: "from-seed",
    title: "From seed to plant",
    task: "Research how a seed becomes a plant. Create 3 images that show what you learned.",
    imageCount: 3,
    prompts: [
      "What does a seed need to grow?",
      "What happens after the root comes out?",
      "Help me write a short note about sprouts.",
      "What should my first picture show?",
    ],
    hints: [
      "A seed in damp soil",
      "A sprout with a root and a small stem",
      "A young plant with green leaves in the sun",
    ],
  },
];

export function starterProject(): Project {
  return { ...STARTERS[0], source: "starter", notice: null };
}

export function nextStarter(currentTitle: string): ProjectTemplate {
  const current = currentTitle.trim().toLowerCase();
  return (
    STARTERS.find((starter) => starter.title.toLowerCase() !== current) ??
    STARTERS[0]
  );
}

export function instanceFromStarter(
  starter: ProjectTemplate,
  notice: string | null,
): Project {
  return {
    ...starter,
    id: crypto.randomUUID(),
    source: "starter",
    notice,
  };
}
