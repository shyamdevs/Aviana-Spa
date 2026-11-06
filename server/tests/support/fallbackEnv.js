// A configured model that does not exist for the key, with the default fallback chain.
process.env.GEMINI_MODEL = 'retired-model-x';
process.env.GEMINI_FALLBACK_MODELS = 'gemini-3.5-flash-lite,gemini-flash-lite-latest';
