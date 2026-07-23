/** Âncora local compartilhada pelas visualizações da rotina. */
const today = new Date()

export const TODAY_ISO = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-")

