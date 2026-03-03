function formatContext(context) {
  return context ? `[${context}]` : "[app]";
}

export function createLogger(context) {
  const prefix = formatContext(context);

  return {
    info(message, meta) {
      if (meta !== undefined) {
        console.log(`${new Date().toISOString()} ${prefix} INFO ${message}`, meta);
        return;
      }
      console.log(`${new Date().toISOString()} ${prefix} INFO ${message}`);
    },
    warn(message, meta) {
      if (meta !== undefined) {
        console.warn(
          `${new Date().toISOString()} ${prefix} WARN ${message}`,
          meta
        );
        return;
      }
      console.warn(`${new Date().toISOString()} ${prefix} WARN ${message}`);
    },
    error(message, meta) {
      if (meta !== undefined) {
        console.error(
          `${new Date().toISOString()} ${prefix} ERROR ${message}`,
          meta
        );
        return;
      }
      console.error(`${new Date().toISOString()} ${prefix} ERROR ${message}`);
    }
  };
}
