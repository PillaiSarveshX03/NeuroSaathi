/**
 * NeuroSathi Translation & Cross-Lingual Bridge Service
 * 
 * Manages translation assistance for tier-2 (translation-supported) languages
 * ensuring that the AI Companion can comfortably reason in low-resource dialects
 * without exposing intermediate translation artifacts to the patient or caregiver.
 */

import { getLanguageCapability, LanguageCapability } from "./languageCapabilities";

export interface TranslationContext {
  sourceLanguage: string;
  targetLanguage: string;
  isDirectLanguage: boolean;
}

/**
 * Prepares dynamic translation guidelines for the AI Agent's system instruction
 */
export function buildTranslationSystemDirective(targetLang: LanguageCapability): string {
  if (targetLang.geminiDirect) {
    return `TARGET RESPONSE LANGUAGE: ${targetLang.name} (${targetLang.nativeName})
- You have direct, fluent generation capability in ${targetLang.name}.
- Formulate your complete final answer directly in ${targetLang.name}.
- Do NOT output English translations or meta-commentary alongside your response.`;
  }

  // Translation-assisted tier (e.g. Maithili, Dogri, Bodo, Santali, Manipuri, Konkani, Kashmiri, Sanskrit)
  return `TARGET RESPONSE LANGUAGE: ${targetLang.name} (${targetLang.nativeName}) [Translation-Assisted Tier]
- The user requires response in ${targetLang.name}.
- Internal cognitive reasoning may use the language's native vocabulary with Hindi/regional grammar bridging.
- Deliver the final answer strictly in authentic ${targetLang.name} with respectful phrasing.
- NEVER expose internal translation tokens, English scratchpads, or system explanations to the user.`;
}

/**
 * Checks if a language requires special translation bridging
 */
export function requiresTranslationBridge(langCodeOrName: string): boolean {
  const cap = getLanguageCapability(langCodeOrName);
  return !cap.geminiDirect && cap.translationSupported;
}
