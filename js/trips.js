// Places I've been. One entry per pin; several pins can share a country.
//   id      ISO 3166 numeric country code (highlights the country on the globe)
//   country name shown on the card (also what "X countries so far" counts)
//   place   optional town or city
//   lat/lon where the pin sits
//   when    optional, e.g. "spring 2024" (cards say "dates soon" when empty)
//   art     pixel postcard from js/landmarks.js, used until there's a photo
//   photo   path to a real photo in assets/trips/ (replaces the pixel postcard)
export const TRIPS = [
  { id: 356, country: "India", place: "Kolkata", lat: 22.57, lon: 88.36, when: "home", note: "Where it all started.", art: "kolkata", photo: "" },
  { id: 840, country: "United States", place: "Granville, Ohio", lat: 40.07, lon: -82.52, when: "college years", note: "Denison University.", art: "liberty", photo: "" },
  { id: 826, country: "England", place: "London", lat: 51.52, lon: -0.04, when: "spring 2024", note: "A semester at Queen Mary.", art: "bigben", photo: "" },
  { id: 826, country: "Scotland", place: "", lat: 55.95, lon: -3.19, when: "", note: "", art: "castle", photo: "" },
  { id: 372, country: "Ireland", place: "", lat: 53.35, lon: -6.26, when: "", note: "", art: "tower", photo: "" },
  { id: 792, country: "Turkey", place: "", lat: 38.64, lon: 34.83, when: "", note: "", art: "balloons", photo: "" },
  { id: 504, country: "Morocco", place: "", lat: 31.63, lon: -7.99, when: "", note: "", art: "minaret", photo: "" },
  { id: 818, country: "Egypt", place: "", lat: 29.98, lon: 31.13, when: "", note: "", art: "pyramids", photo: "" },
  { id: 484, country: "Mexico", place: "", lat: 20.68, lon: -88.57, when: "", note: "", art: "steps", photo: "" },
  { id: 704, country: "Vietnam", place: "", lat: 20.91, lon: 107.18, when: "", note: "", art: "halong", photo: "" },
  { id: 144, country: "Sri Lanka", place: "", lat: 7.96, lon: 80.76, when: "", note: "", art: "sigiriya", photo: "" },
  { id: 50, country: "Bangladesh", place: "", lat: 23.81, lon: 90.41, when: "", note: "", art: "boat", photo: "" },
  { id: 524, country: "Nepal", place: "", lat: 27.72, lon: 85.32, when: "", note: "", art: "himalaya", photo: "" },
  { id: 784, country: "UAE", place: "Abu Dhabi", lat: 24.41, lon: 54.47, when: "", note: "", art: "mosque", photo: "" },
];
