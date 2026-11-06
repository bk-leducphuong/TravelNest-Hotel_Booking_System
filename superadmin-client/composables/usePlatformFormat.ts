import { formatDate, formatMoney } from "~/utils/format";
export function usePlatformFormat() {
  const { locale, t, te } = useI18n();
  const label = (group: string, value: string | null | undefined) =>
    !value
      ? "—"
      : te(`${group}.${value}`)
        ? t(`${group}.${value}`)
        : value.replace(/_/g, " ");
  return {
    date: (value: string | null | undefined) => formatDate(value, locale.value),
    money: (
      value: string | number | null | undefined,
      currency?: string | null
    ) => formatMoney(value, currency, locale.value),
    number: (value: number) =>
      new Intl.NumberFormat(locale.value).format(value),
    label,
  };
}
