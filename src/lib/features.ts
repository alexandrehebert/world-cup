const TRUTHY_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on'])

const toEnvFlagValue = (value: string | undefined) => value?.trim().toLowerCase() ?? ''

export const isPredictionsFeatureEnabled = TRUTHY_FLAG_VALUES.has(
  toEnvFlagValue(process.env.NEXT_PUBLIC_ENABLE_PREDICTIONS),
)
