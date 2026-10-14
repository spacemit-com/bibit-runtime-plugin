import type { FeatureModuleV1 } from '@bibit/feature-sdk'
import { RuntimeSettingsPage } from './RuntimeSettingsPage'
import { RuntimeSecurityPage } from './RuntimeSecurityPage'
import manifest from '../bibit.feature.json'
import { runtimeLocales } from './runtime-i18n'

export const featureModule: FeatureModuleV1 = {
  sdkApiVersion: 1,
  locales: runtimeLocales,
  settings: Object.fromEntries(manifest.contributions.settings.map(({ id }) => [id, id === 'security' ? RuntimeSecurityPage : RuntimeSettingsPage])),
}
