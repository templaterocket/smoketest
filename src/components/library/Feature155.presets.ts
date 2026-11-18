const title = {
  tagline: "Tagline",
  heading: "Medium length section heading goes here",
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.",
  primaryLabel: "Button",
  secondaryLabel: "Button",
};
const long = {
  title: "Medium length section heading goes here",
  text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla.",
};
const short = {
  title: "Medium length section heading goes here",
  text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.",
};
const four = [short, short, short, short];

export const presets = {
  "features-237": { ...title, surface: "default", features: [long, long, long] },
  "features-298": { ...title, surface: "default", features: four },
  "features-302": { ...title, surface: "default", features: four },
  "features-328": { ...title, surface: "image", features: four },
  "features-329": { ...title, surface: "tertiary", features: four },
  "features-332": { ...title, surface: "image", features: four },
  "features-333": { ...title, surface: "tertiary", features: four },
};
