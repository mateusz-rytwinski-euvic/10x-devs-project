import type { BrandVariants, Theme } from '@fluentui/react-components';
import { createLightTheme } from '@fluentui/react-components';

const palette = {
    // Fluent UI Theme Designer output (v8) converted for v9 tokens.
    themePrimary: '#09a1c4',
    themeSecondary: '#21accb',
    themeTertiary: '#5fc5dc',
    themeLight: '#aae1ed',
    themeLighter: '#d0eff6',
    themeLighterAlt: '#f3fbfd',
    themeDarkAlt: '#0992b1',
    themeDark: '#077b95',
    themeDarker: '#055b6e',
    neutralPrimary: '#004464',
    neutralPrimaryAlt: '#4a8aa8',
    neutralSecondary: '#669fb9',
    neutralTertiary: '#85b4ca',
    neutralTertiaryAlt: '#c8c8c8',
    neutralQuaternary: '#d0d0d0',
    neutralQuaternaryAlt: '#dadada',
    neutralLight: '#eaeaea',
    neutralLighter: '#f4f4f4',
    neutralLighterAlt: '#f8f8f8',
    neutralDark: '#1d6586',
    black: '#0d5475',
    white: '#ffffff',
};

// Fluent UI v9 expects a 16-step brand ramp (10-160).
// Values below are interpolated from the designer palette to keep the hue consistent across interaction states.
const brandRamp: BrandVariants = {
    10: '#022d3d',
    20: '#034659',
    30: '#055b6e',
    40: '#066c80',
    50: '#077b95',
    60: '#088daa',
    70: palette.themePrimary,
    80: palette.themeSecondary,
    90: palette.themeTertiary,
    100: '#8fd4e4',
    110: palette.themeLight,
    120: palette.themeLighter,
    130: '#e4f5fa',
    140: '#edf9fc',
    150: '#f5fcfe',
    160: '#fafdff',
};

// The theme aligns Fluent UI tokens with the designer output while taking advantage of v9 theming primitives.
export const appTheme: Theme = {
    ...createLightTheme(brandRamp),
    colorNeutralForeground1: palette.neutralPrimary,
    colorNeutralForeground2: palette.neutralDark,
    colorNeutralForeground3: palette.neutralDark,
    colorNeutralForeground4: palette.neutralPrimary,
    colorNeutralForeground1Static: palette.neutralPrimary,
    colorNeutralForegroundDisabled: palette.neutralTertiaryAlt,
    colorNeutralStrokeAccessible: palette.neutralPrimary,
    colorNeutralStroke1: palette.neutralQuaternary,
    colorNeutralStroke2: palette.neutralQuaternaryAlt,
    colorBrandForegroundLink: palette.themeDark,
    colorBrandForegroundLinkHover: palette.themeDarker,
    colorBrandForegroundLinkPressed: '#044457',
    colorBrandForegroundLinkSelected: '#044457',
    colorBrandStroke1: palette.themePrimary,
    colorBrandStroke2: palette.themeDark,
    colorBrandBackground: palette.themeDark,
    colorBrandBackgroundHover: palette.themeDarker,
    colorBrandBackgroundPressed: '#044457',
    colorBrandBackgroundSelected: palette.themeDarker,
};
