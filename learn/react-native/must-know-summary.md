# React Native: what to know first

**Written:** 2026-11-25 · **For:** Software Engineer and Senior Software Engineer interviews · **Source:** [React Native interview guide](react-native-interview-guide.md) and 4 lessons (11, 14, 15, 17)

This page is a short map of what interviewers ask about React Native. You worked on mobile apps, so expect questions about your own experience first. Use these lines to explain what you already did.

**How to read the stars.** This is my judgement of how often each topic is asked.

- ★★★ Asked in almost every React Native interview.
- ★★ Often asked.
- ★ For depth.

## ★★★ Learn these first

| Topic | Say this in the interview | Common trap |
|---|---|---|
| How React Native works | There is no browser or DOM. Your JavaScript runs on the Hermes engine, and a native layer turns the React tree into real iOS and Android views. | "Bridge vs New Architecture" really asks how the JS to native handoff works. |
| New Architecture | JSI, Fabric and TurboModules replace the old bridge. React Native 0.82 (Oct 2025) removed the old bridge, so there is one architecture now. | Do not describe the old bridge as the current way. |
| Lists: FlatList vs ScrollView | `ScrollView` renders everything, so use it for short content. `FlatList` renders only what is near the screen. FlashList is faster for big lists. | Set `keyExtractor`, avoid inline functions in `renderItem`, and use `getItemLayout` when heights are fixed. |
| Flexbox ([lesson 11](11-flexbox-layout.md)) | Flexbox is the only layout system. The default `flexDirection` is `column`, the opposite of the web's `row`. | No CSS files and no cascade. Units are plain numbers. |
| Expo vs bare | Expo gives speed and tooling (EAS). Bare gives full native control. With `prebuild` the gap is small now. | Say what your project used and why. |
| OTA updates | JavaScript and assets can ship over the air without store review. Native code cannot, ever. | Know the risk: it skips the review gate. CodePush was retired in 2025, so Expo Updates is the usual path. |

## ★★ Learn these second

| Topic | Say this in the interview |
|---|---|
| Animations ([lesson 14](14-animated-api.md), [lesson 15](15-reanimated.md)) | `Animated` with `useNativeDriver: true` runs on the native side. Reanimated runs worklets on the UI thread, so animations stay smooth even when JS is busy. |
| Navigation | There is no browser URL. Deep links map to screens. React Navigation is low level and works in bare. Expo Router is file based and sits on top of it. |
| Storage | AsyncStorage for simple data. MMKV is much faster but not for secrets. SecureStore or Keychain is the only right place for tokens. |
| Offline first | Save locally first, sync later, and decide how to resolve conflicts. |
| Performance debugging | Use React Native DevTools (Flipper is dead). Look for list re-renders, big JS work on the main thread, and large images. |
| Forms and regex ([lesson 17](17-regex-for-forms.md)) | Know how to format `1234567` as `1.234.567` and how to validate email and password fields. |

## ★ For depth

- Native modules and platform-specific code (`Platform.select`, `.ios.js` and `.android.js` files).
- The release process: store builds take days (review). OTA takes minutes.
- Real cases to cite are in the guide: Discord (shares about 98% of code), Shopify (built FlashList), Coinbase (moved to RN), Airbnb (moved away in 2018, and RN has changed a lot since).

## The 6 questions most likely to come up

1. "Explain the React Native bridge vs the New Architecture." (guide, key concepts)
2. "FlatList or ScrollView? What props matter?" 
3. "Expo or bare React Native?"
4. "How does an OTA update work, and what are its limits?"
5. "How would you debug jank in a production app?"
6. "How does navigation and deep linking work with no URL?"

## Honest notes

- Only 4 of the planned lessons exist, so most of this comes from the guide. The guide's facts (RN 0.82, Flipper, CodePush) were checked in 2025 and 2026. Re-check before an interview if the version matters.
- You built ZWS and the DBO mobile app. Only tell stories with facts you can state yourself. Use `/project-story` to prepare them.
