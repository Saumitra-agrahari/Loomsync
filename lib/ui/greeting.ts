/**
 * Time of day greeting helper for user personalization
 * Microcopy requirement: "Good morning, Murugan" or "Good afternoon, Priya"
 * (first name only, based on current user and time of day).
 */
export function getTimeOfDayGreeting(
  name?: string | null,
  locale: "en" | "ta" = "en"
): string {
  const hour = new Date().getHours();
  const firstName = name ? name.trim().split(" ")[0] : "";

  if (locale === "ta") {
    // // TODO: Native Tamil speaker review
    if (hour < 12) {
      return firstName ? `காலை வணக்கம், ${firstName}` : "காலை வணக்கம்";
    } else if (hour < 17) {
      return firstName ? `மதிய வணக்கம், ${firstName}` : "மதிய வணக்கம்";
    } else {
      return firstName ? `மாலை வணக்கம், ${firstName}` : "மாலை வணக்கம்";
    }
  }

  // English greetings
  if (hour < 12) {
    return firstName ? `Good morning, ${firstName}` : "Good morning";
  } else if (hour < 17) {
    return firstName ? `Good afternoon, ${firstName}` : "Good afternoon";
  } else {
    return firstName ? `Good evening, ${firstName}` : "Good evening";
  }
}
