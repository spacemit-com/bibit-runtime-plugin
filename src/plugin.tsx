import { registerFeaturePlugin } from '@bibit/feature-plugin-sdk'
import type { FeatureManifestV1 } from '@bibit/feature-contracts'
import manifestJson from '../bibit.feature.json'
import { featureModule } from './feature'

export { runtimeLocales as pluginLocales } from './runtime-i18n'

registerFeaturePlugin({ manifest: manifestJson as FeatureManifestV1, module: featureModule })
