const formatDate = (iso?: string | null): string | null | undefined => {
  if (!iso) return iso;

  const monthNames: string[] = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dic"
  ];

  const [datePart, timePart] = iso.slice(0, 19).split("T");
  const [y, m, d] = datePart.split("-");

  const pretty = `${parseInt(d, 10)}-${
    monthNames[parseInt(m, 10) - 1]
  }-${y} ${timePart}`;

  return pretty;
};

export default formatDate;
