// client/src/utils/programMapping.ts

import { ProgramType } from "../types";

// Map to normalize various program spellings/formats to our standard program types
const programAliasMap: Record<string, ProgramType> = {
  // BBA variations
  BBA: "BBA",
  "B.B.A": "BBA",
  "B.B.A.": "BBA",
  "BACHELOR OF BUSINESS ADMINISTRATION": "BBA",

  // B.Com variations
  BCOM: "B.Com.",
  "B.COM": "B.Com.",
  "B COM": "B.Com.",
  "B.COM.": "B.Com.",
  "BACHELOR OF COMMERCE": "B.Com.",

  // B.Tech CSE variations
  BTECH: "B.Tech (CSE)",
  "B TECH": "B.Tech (CSE)",
  "B.TECH": "B.Tech (CSE)",
  "B.TECH CSE": "B.Tech (CSE)",
  "B.TECH (CSE)": "B.Tech (CSE)",
  "BTECH CSE": "B.Tech (CSE)",
  "BACHELOR OF TECHNOLOGY CSE": "B.Tech (CSE)",
  "BACHELOR OF TECHNOLOGY (CSE)": "B.Tech (CSE)",

  // B.Tech AI & ML variations
  "B.TECH AI&ML": "B.Tech (AI&ML)",
  "B.TECH (AI&ML)": "B.Tech (AI&ML)",
  "BTECH AI&ML": "B.Tech (AI&ML)",
  "BTECH (AI&ML)": "B.Tech (AI&ML)",
  "B.TECH AIML": "B.Tech (AI&ML)",
  "B.TECH AI ML": "B.Tech (AI&ML)",

  // B.Tech CSE (AI & ML) variations
  "B.TECH CSE (AI & ML)": "B.Tech CSE (AI & ML)",
  "BTECH CSE (AI & ML)": "B.Tech CSE (AI & ML)",
  "B.TECH CSE AI & ML": "B.Tech CSE (AI & ML)",
  "BTECH CSE AI & ML": "B.Tech CSE (AI & ML)",
  "B.TECH CSE AIML": "B.Tech CSE (AI & ML)",

  // B.Tech CSE (IoT) variations
  "B.TECH CSE (IOT)": "B.Tech CSE (IoT)",
  "BTECH CSE (IOT)": "B.Tech CSE (IoT)",
  "B.TECH CSE IOT": "B.Tech CSE (IoT)",
  "BTECH CSE IOT": "B.Tech CSE (IoT)",

  // B.Tech CSE (Robotics) variations
  "B.TECH CSE (ROBOTICS)": "B.Tech CSE (Robotics)",
  "BTECH CSE (ROBOTICS)": "B.Tech CSE (Robotics)",
  "B.TECH CSE ROBOTICS": "B.Tech CSE (Robotics)",
  "BTECH CSE ROBOTICS": "B.Tech CSE (Robotics)",

  // B.Tech Biotechnology variations
  "B.TECH BIOTECHNOLOGY": "B.Tech.(Biotechnology)",
  "B.TECH (BIOTECHNOLOGY)": "B.Tech.(Biotechnology)",
  "BTECH BIOTECHNOLOGY": "B.Tech.(Biotechnology)",
  "BTECH (BIOTECHNOLOGY)": "B.Tech.(Biotechnology)",
  "B.TECH BT": "B.Tech.(Biotechnology)",

  // B.Pharm variations
  "B.PHARM": "B.Pharm",
  "B PHARM": "B.Pharm",
  BPHARM: "B.Pharm",
  "BACHELOR OF PHARMACY": "B.Pharm",

  // BA Applied Psychology variations
  "BA APPLIED PSYCHOLOGY": "BA Applied Psychology",
  "B.A. APPLIED PSYCHOLOGY": "BA Applied Psychology",
  "BA (APPLIED PSYCHOLOGY)": "BA Applied Psychology",
  "B.A. (APPLIED PSYCHOLOGY)": "BA Applied Psychology",

  // B.Sc. Clinical Psychology variations
  "BSC CLINICAL PSYCHOLOGY": "B.Sc. Clinical Psychology",
  "B.SC. CLINICAL PSYCHOLOGY": "B.Sc. Clinical Psychology",
  "B.SC CLINICAL PSYCHOLOGY": "B.Sc. Clinical Psychology",

  // BA LLB variations
  "BA LLB": "BA LLB",
  "B.A. LLB": "BA LLB",
  "B.A LLB": "BA LLB",
  "BA L.L.B.": "BA LLB",
  "B.A. L.L.B.": "BA LLB",

  // BA variations
  BA: "BA",
  "B.A.": "BA",
  "B.A": "BA",
  "BACHELOR OF ARTS": "BA",

  // B.Sc. variations
  BSC: "B.Sc.",
  "B.SC.": "B.Sc.",
  "B.SC": "B.Sc.",
  "BACHELOR OF SCIENCE": "B.Sc.",

  // B.Des. variations
  BDES: "B.Des.",
  "B.DES.": "B.Des.",
  "B.DES": "B.Des.",
  "BACHELOR OF DESIGN": "B.Des.",

  // BCA variations
  BCA: "BCA",
  "B.C.A.": "BCA",
  "B.C.A": "BCA",
  "BACHELOR OF COMPUTER APPLICATIONS": "BCA",

  // M.Sc. Data Science variations
  "MSC DATA SCIENCE": "M.Sc. Data Science",
  "M.SC. DATA SCIENCE": "M.Sc. Data Science",
  "M.SC DATA SCIENCE": "M.Sc. Data Science",

  // M.Sc. Cyber Security variations
  "MSC CYBER SECURITY": "M.Sc. Cyber Security",
  "M.SC. CYBER SECURITY": "M.Sc. Cyber Security",
  "M.SC CYBER SECURITY": "M.Sc. Cyber Security",

  // M.Tech. variations
  MTECH: "M.Tech.",
  "M.TECH.": "M.Tech.",
  "M.TECH": "M.Tech.",
  "MASTER OF TECHNOLOGY": "M.Tech.",

  // MCA variations
  MCA: "MCA",
  "M.C.A.": "MCA",
  "M.C.A": "MCA",
  "MASTER OF COMPUTER APPLICATIONS": "MCA",

  // LLM variations
  LLM: "LLM",
  "L.L.M.": "LLM",
  "L.L.M": "LLM",
  "MASTER OF LAWS": "LLM",

  // MBA variations
  MBA: "MBA",
  "M.B.A.": "MBA",
  "M.B.A": "MBA",
  "MASTER OF BUSINESS ADMINISTRATION": "MBA",

  // M.Sc. Clinical Psychology variations
  "MSC CLINICAL PSYCHOLOGY": "M.Sc. Clinical Psychology",
  "M.SC. CLINICAL PSYCHOLOGY": "M.Sc. Clinical Psychology",
  "M.SC CLINICAL PSYCHOLOGY": "M.Sc. Clinical Psychology",

  // M.Sc(Biotechnology) variations
  "MSC BIOTECHNOLOGY": "M.Sc(Biotechnology)",
  "M.SC. BIOTECHNOLOGY": "M.Sc(Biotechnology)",
  "M.SC BIOTECHNOLOGY": "M.Sc(Biotechnology)",
  "M.SC. (BIOTECHNOLOGY)": "M.Sc(Biotechnology)",
  "M.SC (BIOTECHNOLOGY)": "M.Sc(Biotechnology)",
};

/**
 * Maps any program name to a valid program type
 * @param program The program name to map
 * @returns A valid ProgramType or the default "BBA" if no mapping found
 */
export const mapProgramName = (
  program: string | undefined | null
): ProgramType => {
  if (!program) return "BBA";

  // Normalize input: uppercase and trim
  const normalizedProgram = program.toUpperCase().trim();

  // Direct lookup in our map
  if (normalizedProgram in programAliasMap) {
    return programAliasMap[normalizedProgram];
  }

  // Try to find a close match
  for (const [key, value] of Object.entries(programAliasMap)) {
    if (normalizedProgram.includes(key) || key.includes(normalizedProgram)) {
      return value;
    }
  }

  // Check for broad patterns
  if (
    normalizedProgram.includes("B.TECH") ||
    normalizedProgram.includes("BTECH")
  ) {
    return "B.Tech (CSE)";
  }

  if (
    normalizedProgram.includes("M.TECH") ||
    normalizedProgram.includes("MTECH")
  ) {
    return "M.Tech.";
  }

  if (normalizedProgram.includes("BSC") || normalizedProgram.includes("B.SC")) {
    return "B.Sc.";
  }

  if (normalizedProgram.includes("MSC") || normalizedProgram.includes("M.SC")) {
    return "M.Sc. Data Science";
  }

  // Default fallback
  return "BBA";
};
