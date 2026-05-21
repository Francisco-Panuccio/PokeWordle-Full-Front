export interface ValidPokemonResult {
    letterHints: ("correct" | "present" | "absent")[];
    match: boolean;
    decodedTarget?: string;
    validName?: boolean;
    error?: string; 
}