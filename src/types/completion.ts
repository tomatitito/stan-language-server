import type { Position } from "./common";

export type { Position };

export interface Searchable {
  name: string;
}

export interface Distribution extends Searchable {}
export interface StanFunction extends Searchable {}
export interface Keyword extends Searchable {}
export interface Datatype extends Searchable {}
export interface Constraint extends Searchable {}
