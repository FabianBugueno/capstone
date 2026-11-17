// La tabla incidencias guarda la hora UTC sin zona; sin la "Z" el navegador la tomaria como hora local
export const fechaUTC = (ts: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts}Z`);
