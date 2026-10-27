import { create } from 'zustand';

import { getContainer } from '@/container';
import type { OnboardingService } from '@/services/onboarding.service';

type OnboardingState = {
  /** Read once at startup; the root layout shows onboarding while this is false. */
  onboarded: boolean;
  /** Saves the flag, then switches the app to the tabs. */
  complete: () => Promise<void>;
};

export const useOnboarding = create<OnboardingState>()((set) => ({
  onboarded: false,
  complete: async () => {
    // Save before switching so a crash right after never shows onboarding again.
    await getContainer().onboardingService.complete();
    set({ onboarded: true });
  },
}));

export async function hydrateOnboarding(service: OnboardingService): Promise<void> {
  useOnboarding.setState({ onboarded: await service.isComplete() });
}
