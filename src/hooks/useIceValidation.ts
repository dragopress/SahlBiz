import { useState, useMemo } from 'react';

export interface IceValidationResult {
  ice: string;
  setIce: (val: string) => void;
  isValid: boolean;
  isEmpty: boolean;
  isFormatted: boolean;
  digitCount: number;
  error: string | null;
  successMessage: string | null;
  formattedIce: string;
  progressPercentage: number;
}

export function useIceValidation(initialValue: string = ''): IceValidationResult {
  const [ice, setIce] = useState(initialValue);

  const analysis = useMemo(() => {
    const raw = ice.trim();
    const cleanedDigits = raw.replace(/\D/g, '');
    const digitCount = cleanedDigits.length;
    const isEmpty = raw.length === 0;

    if (isEmpty) {
      return {
        isValid: true, // Non-mandatory for B2C unless B2B requested
        isEmpty: true,
        isFormatted: false,
        digitCount: 0,
        error: null,
        successMessage: null,
        formattedIce: '',
        progressPercentage: 0,
      };
    }

    // Check for non-numeric characters
    if (/[^\d\s\-]/.test(raw)) {
      return {
        isValid: false,
        isEmpty: false,
        isFormatted: false,
        digitCount,
        error: "L'ICE ne doit contenir que des chiffres (0-9).",
        successMessage: null,
        formattedIce: cleanedDigits,
        progressPercentage: Math.min(100, Math.round((digitCount / 15) * 100)),
      };
    }

    if (digitCount < 15) {
      return {
        isValid: false,
        isEmpty: false,
        isFormatted: false,
        digitCount,
        error: `Saisie en cours : ${digitCount}/15 chiffres (15 chiffres requis).`,
        successMessage: null,
        formattedIce: cleanedDigits,
        progressPercentage: Math.round((digitCount / 15) * 100),
      };
    }

    if (digitCount > 15) {
      return {
        isValid: false,
        isEmpty: false,
        isFormatted: false,
        digitCount,
        error: `ICE trop long : ${digitCount}/15 chiffres (maximum 15).`,
        successMessage: null,
        formattedIce: cleanedDigits.slice(0, 15),
        progressPercentage: 100,
      };
    }

    // Exactly 15 digits
    return {
      isValid: true,
      isEmpty: false,
      isFormatted: true,
      digitCount: 15,
      error: null,
      successMessage: 'ICE Conforme (15 chiffres certifiés DGI Maroc)',
      formattedIce: cleanedDigits,
      progressPercentage: 100,
    };
  }, [ice]);

  return {
    ice,
    setIce,
    ...analysis,
  };
}
