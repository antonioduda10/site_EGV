function writesUserData(sql) {
  // Conservative guard for ordinary DML; dynamic SQL still requires human review.
  return /\b(?:UPDATE|INSERT\s+INTO|MERGE\s+INTO|COPY)\s+(?:"?public"?\s*\.\s*)?"?Usuario"?(?=\s|\()/i.test(sql);
}

module.exports = { writesUserData };
