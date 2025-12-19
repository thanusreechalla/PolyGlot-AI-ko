
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

/**
 * Decodes raw PCM audio bytes from base64 string
 */
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts raw PCM data to AudioBuffer for playback
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const translateTextStream = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  onChunk: (chunk: string) => void
) => {
  // Initialize GoogleGenAI directly with process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const sourceLabel = sourceLang === 'auto' ? 'automatically detected' : sourceLang;
  
  const prompt = `Translate the following text from ${sourceLabel} to ${targetLang}. 
  Provide ONLY the translated text without any explanations, notes, or prefixes.
  Maintain the original tone, formatting, and cultural nuances.
  
  Text to translate:
  "${text}"`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    for await (const chunk of response) {
      // Access text property directly (not a method)
      const text = (chunk as GenerateContentResponse).text;
      if (text) onChunk(text);
    }
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const playSpeech = async (text: string, voice: string = 'Kore') => {
  // Initialize GoogleGenAI directly with process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this text clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received");

    // Output audio bytes returned by API is raw PCM data, sample rate for TTS models is 24000
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      outputAudioContext,
      24000,
      1,
    );

    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    source.start();
    
    return source;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};
