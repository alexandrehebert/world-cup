const TRUTHY_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on'])

const toEnvFlagValue = (value: string | undefined) => value?.trim().toLowerCase() ?? ''

export const isFeatureFlagEnabled = (value: string | undefined) => TRUTHY_FLAG_VALUES.has(toEnvFlagValue(value))

export const isPredictionsFeatureEnabled = isFeatureFlagEnabled(process.env.NEXT_PUBLIC_ENABLE_PREDICTIONS)
export const isAccountFeatureEnabled = isFeatureFlagEnabled(process.env.NEXT_PUBLIC_ENABLE_ACCOUNT)
