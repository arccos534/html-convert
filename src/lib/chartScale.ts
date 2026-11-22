export const chartScaleDivisions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const getChartScaleDivisions = (divisions = 4) =>
  chartScaleDivisions.includes(divisions) ? divisions : 4

export const getChartGridSize = (divisions?: number) =>
  `${100 / getChartScaleDivisions(divisions)}%`
