import publishersJson from "../../data/publishers.json";
import personasJson from "../../data/shopper_personas.json";
import type { Publisher, Persona } from "./types";

export const PUBLISHERS = publishersJson as Publisher[];
export const PERSONAS = personasJson as Persona[];

const publisherById = new Map(PUBLISHERS.map((p) => [p.id, p]));
const personaById = new Map(PERSONAS.map((p) => [p.id, p]));

export const getPublisher = (id: string): Publisher | undefined => publisherById.get(id);
export const getPersona = (id: string): Persona | undefined => personaById.get(id);

export const PUBLISHER_IDS = PUBLISHERS.map((p) => p.id);
export const PERSONA_IDS = PERSONAS.map((p) => p.id);
