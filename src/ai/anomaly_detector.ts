// Since we can't easily run scikit-learn in this Node environment,
// we implement a weighted scoring model that mimics the behavior of an anomaly detector.

export class AnomalyDetector {
  predict(features: number[], threshold: number = 0.35): [boolean, number] {
    const [
      hour,
      isWeekend,
      failRate,
      reqPerMin,
      bytes,
      portRisk,
      isThreat,
      eventType,
      geoRisk,
      statusGroup
    ] = features;

    let score = 0;

    // Weighting logic
    if (isThreat) score += 0.4;
    if (eventType >= 3) score += 0.3; // brute_force or data_exfil
    if (geoRisk >= 0.7) score += 0.15;
    if (portRisk === 1.0) score += 0.1;
    if (failRate > 0.7) score += 0.2;
    if (reqPerMin > 30) score += 0.2;
    if (bytes > 50) score += 0.2; // 50KB+
    if (statusGroup >= 1) score += 0.05;

    // Normalize score to 0-1
    const normalizedScore = Math.min(score, 1.0);
    const isAnomaly = normalizedScore > threshold;

    return [isAnomaly, normalizedScore];
  }
}

export const anomalyDetector = new AnomalyDetector();
