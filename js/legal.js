// SCaD Gestión · Textos legales · v0.6.8
// Política de privacidad y Condiciones del Servicio de la plataforma SCaD (versión 1.0, octubre 2026).
// Se muestran en modal desde el menú de cuenta. Cada línea: [tipo, texto]; tipo "h" título de sección, "p" párrafo, "l" elemento de lista.

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PRIVACIDAD = {
  titulo: "Política de privacidad",
  subtitulo: "Plataforma SCaD · Última actualización: 23 de octubre de 2026",
  lineas: [
    ["h", "1. Responsable y alcance"],
    ["p", "JM OPERADOR INTEGRAL EN SERVICIOS Y SOLUCIONES, S.A. DE C.V., con domicilio en Villa de las Ramas 107, Villas de Elguera, Celaya, Guanajuato, México, es responsable del tratamiento de los datos personales que recaba directamente mediante la plataforma SCaD, sus sitios y sistemas de gestión referenciados en www.scad.mx, en los casos que corresponda."],
    ["p", "Algunos sistemas son operados por entes operativos o empresas usuarias que administran información de sus propios colaboradores, clientes o participantes. En esos casos, el ente operativo puede actuar como responsable de determinados datos y SCaD como proveedor tecnológico o encargado, según la relación y las funciones aplicables."],
    ["h", "2. Datos que podemos tratar"],
    ["p", "Según el sistema y el servicio utilizado, podemos tratar datos de identificación y contacto (como nombre, correo electrónico y teléfono), información de cuenta y acceso, empresa o ente operativo, roles y permisos, registros de actividad, archivos que el usuario decida proporcionar y datos técnicos necesarios para seguridad y funcionamiento. No todos los sistemas solicitan los mismos datos."],
    ["p", "Si alguna función requiere datos personales sensibles, se informará específicamente sobre su finalidad y se solicitará el consentimiento que corresponda conforme a la ley."],
    ["h", "3. Finalidades del tratamiento"],
    ["l", "Crear y administrar cuentas, identificar usuarios y controlar sus permisos de acceso."],
    ["l", "Prestar los servicios y ejecutar las funciones de cada sistema de gestión contratado o utilizado."],
    ["l", "Guardar registros, generar documentos, atender solicitudes y brindar soporte técnico."],
    ["l", "Proteger la plataforma, prevenir accesos no autorizados y cumplir obligaciones legales aplicables."],
    ["p", "Si se pretendiera utilizar datos para finalidades adicionales que requieran consentimiento, se informará previamente y se habilitará el mecanismo legal correspondiente para aceptarlas o rechazarlas."],
    ["h", "4. Integración con Google Drive"],
    ["p", "Cuando las funciones de un sistema SCaD lo requieren y el ente operativo correspondiente autoriza la integración con Google Drive, su finalidad es crear y guardar archivos generados por el sistema en la carpeta de Drive que ese ente operativo elija para su cuenta de operación."],
    ["p", "Los sistemas SCaD no están diseñados para explorar, consultar ni utilizar otros archivos o carpetas de Drive ajenos a esa finalidad. La integración se utiliza únicamente para las operaciones necesarias para generar y almacenar los documentos correspondientes. Los permisos técnicos que Google solicite al autorizar la conexión deben corresponder a esta finalidad y pueden consultarse en la pantalla de autorización de Google."],
    ["p", "El ente operativo conserva el control de su cuenta de Google y puede revocar el acceso concedido desde la configuración de seguridad de su cuenta. La revocación puede impedir que se sigan guardando archivos mediante esta función."],
    ["h", "5. Servicios de terceros y transferencias"],
    ["p", "Para operar los sistemas pueden intervenir proveedores de infraestructura, alojamiento, autenticación, pagos o almacenamiento, incluidos Wix y Google cuando corresponda. Su intervención se limita a las funciones contratadas y se sujeta a sus condiciones y avisos aplicables. Si una transferencia de datos personales requiere consentimiento conforme a la legislación mexicana, se solicitará previamente, salvo las excepciones legales."],
    ["h", "6. Conservación y seguridad"],
    ["p", "Conservamos los datos durante el tiempo necesario para prestar los servicios, cumplir las finalidades informadas y atender obligaciones legales. Aplicamos medidas administrativas, técnicas y organizativas razonables para protegerlos contra pérdida, alteración, divulgación o acceso no autorizado."],
    ["h", "7. Derechos ARCO y revocación del consentimiento"],
    ["p", "Puede solicitar el acceso, rectificación, cancelación u oposición al tratamiento de sus datos personales (derechos ARCO), así como revocar su consentimiento o solicitar la limitación del uso o divulgación cuando proceda, escribiendo a logcontrol@scad.mx."],
    ["p", "Indique su nombre, un medio para responder, el derecho que desea ejercer, una descripción de los datos involucrados y, cuando sea necesario, los elementos para acreditar su identidad o representación. Se atenderá la solicitud conforme a los plazos y requisitos previstos en la legislación aplicable. Si los datos están bajo responsabilidad de un ente operativo, se canalizará la solicitud a quien corresponda."],
    ["h", "8. Cookies y tecnologías similares"],
    ["p", "Los sitios y aplicaciones pueden emplear cookies, almacenamiento local y tecnologías equivalentes para mantener sesiones, recordar preferencias y asegurar el funcionamiento. Las tecnologías no indispensables, cuando existan, se sujetarán a las opciones de información y consentimiento que resulten aplicables."],
    ["h", "9. Cambios a esta política"],
    ["p", "Esta política puede actualizarse por cambios legales, técnicos o funcionales. La versión vigente se encontrará disponible desde el sitio de SCaD; cuando una modificación lo requiera, se comunicará por los medios pertinentes."],
    ["h", "10. Contacto"],
    ["p", "Para dudas o solicitudes relacionadas con la privacidad y el tratamiento de datos personales: logcontrol@scad.mx."]
  ]
};

const CONDICIONES = {
  titulo: "Condiciones del Servicio",
  subtitulo: "Plataforma SCaD — Sistemas de Control y Administración Digital · Versión 1.0 · Octubre de 2026",
  lineas: [
    ["h", "I. Objeto y alcance"],
    ["p", "La plataforma SCaD integra diversos sistemas, aplicaciones y herramientas digitales desarrollados para facilitar procesos de administración, organización, comunicación, programación, supervisión, capacitación, seguimiento y control de actividades."],
    ["p", "Las presentes Condiciones del Servicio establecen los términos generales para el acceso y utilización de los sistemas que forman parte de SCaD, disponibles a través de www.scad.mx, sus subdominios y demás medios digitales autorizados."],
    ["p", "Estas condiciones son aplicables a los sistemas existentes y a aquellos que se desarrollen o incorporen posteriormente, sin perjuicio de las condiciones particulares que puedan establecerse para determinadas aplicaciones, funcionalidades o modalidades de contratación."],
    ["p", "El uso de cualquiera de los sistemas SCaD implica la aceptación de las presentes condiciones, en los términos que correspondan a la relación de cada usuario con la plataforma."],
    ["h", "II. Partes involucradas"],
    ["p", "Para efectos de estas condiciones se reconocen las siguientes figuras:"],
    ["l", "Empresa Técnica (ET): JM OPERADOR INTEGRAL EN SERVICIOS Y SOLUCIONES, S.A. DE C.V., responsable del desarrollo, administración tecnológica, mantenimiento y soporte de la plataforma SCaD."],
    ["l", "Ente Operativo (EO): Persona física o moral, organización, institución o unidad de operación que utiliza uno o varios sistemas SCaD para administrar sus actividades, recursos, procesos o servicios."],
    ["l", "Usuario Final (USU): Persona autorizada para utilizar uno o varios sistemas SCaD, de acuerdo con las funciones, permisos y condiciones establecidos por el EO correspondiente."],
    ["p", "Cuando un sistema sea utilizado directamente por una persona, sin intervención de una organización, dicha persona podrá asumir las funciones de EO y Usuario Final, según corresponda al modelo funcional de la aplicación."],
    ["h", "III. Naturaleza del servicio"],
    ["p", "SCaD constituye una plataforma tecnológica que proporciona herramientas para apoyar la gestión de actividades y procesos."],
    ["p", "La ET proporciona la infraestructura funcional y tecnológica necesaria para la operación de los sistemas, mientras que cada EO conserva la responsabilidad de administrar sus propios procesos, usuarios, recursos e información."],
    ["p", "Las aplicaciones SCaD son instrumentos de apoyo y no sustituyen las responsabilidades administrativas, laborales, profesionales, contractuales, comerciales o legales que correspondan a quienes las utilizan."],
    ["p", "La disponibilidad de determinadas funcionalidades dependerá del sistema, modalidad de acceso, configuración, permisos y servicios contratados."],
    ["h", "IV. Acceso y autorizaciones"],
    ["p", "El acceso a los sistemas SCaD podrá realizarse mediante registro directo, invitación, códigos de acceso, suscripciones, planes de servicio, autorizaciones institucionales u otros mecanismos establecidos para cada aplicación."],
    ["p", "Cada sistema podrá contar con sus propios requisitos de acceso, niveles de autorización y perfiles funcionales."],
    ["p", "El EO será responsable de determinar qué personas pueden utilizar los sistemas asociados a su cuenta de operación, así como de asignar, modificar, suspender o revocar sus autorizaciones."],
    ["p", "La ET podrá establecer mecanismos de autenticación, verificación, control de sesiones y seguridad tecnológica para proteger el funcionamiento de la plataforma."],
    ["p", "El acceso a un sistema SCaD no implica autorización automática para utilizar los demás sistemas que integran la plataforma."],
    ["h", "V. Responsabilidades del Ente Operativo"],
    ["p", "Corresponde al EO:"],
    ["l", "Administrar sus cuentas, usuarios, perfiles y autorizaciones."],
    ["l", "Determinar las actividades y procesos que gestionará mediante los sistemas."],
    ["l", "Supervisar la información registrada por sus usuarios."],
    ["l", "Establecer las instrucciones internas para el uso de las herramientas."],
    ["l", "Mantener actualizada la información necesaria para su operación."],
    ["l", "Verificar que el uso de los sistemas sea compatible con sus obligaciones legales, administrativas y contractuales."],
    ["l", "Conservar, cuando corresponda, los documentos y registros formales necesarios para acreditar sus actividades."],
    ["p", "El EO reconoce que SCaD proporciona herramientas tecnológicas, pero no asume la dirección, supervisión material ni responsabilidad por las actividades que el propio EO administra mediante ellas."],
    ["h", "VI. Responsabilidades del Usuario Final"],
    ["p", "Los usuarios deberán utilizar los sistemas exclusivamente para los fines autorizados."],
    ["p", "Cada usuario será responsable de mantener la confidencialidad de sus credenciales, utilizar adecuadamente las funcionalidades disponibles y registrar información veraz y pertinente."],
    ["p", "No está permitido utilizar los sistemas para alterar registros sin autorización, suplantar identidades, acceder a información ajena, interferir con el funcionamiento de las aplicaciones o realizar actividades contrarias a la legislación aplicable."],
    ["p", "Las acciones realizadas mediante una cuenta podrán quedar asociadas a la identidad y autorizaciones del usuario correspondiente, de acuerdo con las características funcionales de cada sistema."],
    ["h", "VII. Información y registros operativos"],
    ["p", "Los sistemas SCaD permiten registrar, consultar, actualizar, organizar y generar información relacionada con las actividades que administra cada EO."],
    ["p", "La naturaleza de esta información dependerá de las funcionalidades de cada aplicación."],
    ["p", "El EO será responsable del contenido, exactitud, pertinencia y utilización de los registros generados en su cuenta de operación."],
    ["p", "La ET no garantiza la veracidad de la información capturada por los usuarios ni asume responsabilidad por las decisiones que el EO adopte con base en ella."],
    ["p", "Los registros digitales generados por SCaD podrán servir como elementos de consulta, seguimiento o soporte operativo. Sin embargo, su existencia no implica necesariamente que constituyan documentos oficiales, certificaciones, constancias legales o pruebas concluyentes del cumplimiento de una obligación."],
    ["p", "Su valor documental o probatorio dependerá de su naturaleza, integridad, autenticidad y de las disposiciones legales aplicables."],
    ["h", "VIII. Documentos y archivos"],
    ["p", "Determinados sistemas SCaD podrán incorporar funcionalidades para generar, almacenar, consultar, descargar o administrar documentos y archivos digitales."],
    ["p", "El EO será responsable de determinar qué documentos incorpora, genera o conserva mediante las herramientas disponibles."],
    ["p", "Cuando una aplicación permita utilizar servicios externos de almacenamiento, su funcionamiento estará sujeto a las autorizaciones, configuraciones y condiciones técnicas correspondientes."],
    ["p", "La ET no asume la obligación de conservar indefinidamente los documentos generados por los sistemas ni de sustituir los mecanismos de respaldo documental que correspondan al EO. El EO deberá mantener sus propios procedimientos de conservación y respaldo cuando la naturaleza de sus actividades así lo requiera."],
    ["h", "IX. Disponibilidad y continuidad"],
    ["p", "La ET procurará mantener los sistemas SCaD en condiciones adecuadas de funcionamiento, disponibilidad y seguridad tecnológica."],
    ["p", "No obstante, el servicio podrá experimentar interrupciones temporales por mantenimiento, actualizaciones, fallas de conectividad, problemas de infraestructura, servicios de terceros o circunstancias ajenas al control razonable de la ET."],
    ["p", "La ET podrá realizar ajustes, correcciones y mejoras técnicas necesarias para mantener la operación de las aplicaciones."],
    ["p", "Salvo que exista un acuerdo específico, la utilización de SCaD no implica garantía de disponibilidad permanente e ininterrumpida."],
    ["p", "Las interrupciones no liberan automáticamente a las partes de las obligaciones que les correspondan, y sus consecuencias se atenderán conforme a la legislación aplicable y a los acuerdos de servicio existentes."],
    ["h", "X. Actualizaciones y modificaciones"],
    ["p", "Los sistemas SCaD podrán recibir actualizaciones destinadas a mejorar su funcionamiento, incorporar herramientas, corregir errores, fortalecer la seguridad o adaptar sus características a nuevas necesidades."],
    ["p", "La ET podrá modificar interfaces, procedimientos y funcionalidades, procurando conservar la continuidad de los procesos esenciales de cada aplicación."],
    ["p", "Cuando una modificación afecte sustancialmente las condiciones de utilización, los servicios contratados o las obligaciones de los usuarios, se informará mediante los mecanismos disponibles y con la anticipación que corresponda."],
    ["p", "La incorporación de nuevas aplicaciones a la plataforma no implica su inclusión automática en los planes o servicios previamente contratados."],
    ["h", "XI. Planes, suscripciones y servicios contratados"],
    ["p", "Algunos sistemas SCaD podrán ofrecer modalidades gratuitas, accesos institucionales, planes de suscripción o servicios sujetos a contratación."],
    ["p", "Las características, funcionalidades, vigencias, precios, condiciones de pago y mecanismos de renovación o cancelación se establecerán en la información particular de cada servicio."],
    ["p", "La contratación de una modalidad específica otorgará únicamente los derechos de uso y funcionalidades expresamente comprendidos en ella."],
    ["p", "Los pagos, renovaciones, cancelaciones y reembolsos se sujetarán a las condiciones informadas al contratar y a la legislación aplicable."],
    ["h", "XII. Soporte técnico"],
    ["p", "La ET podrá proporcionar orientación y soporte relacionados con el acceso, funcionamiento y utilización tecnológica de los sistemas SCaD."],
    ["p", "El soporte podrá comprender atención de incidencias, corrección de errores, aclaraciones funcionales y orientación sobre herramientas disponibles."],
    ["p", "La prestación de soporte no implica que la ET asuma las funciones administrativas, operativas o profesionales que corresponden al EO."],
    ["p", "Las solicitudes de desarrollo, personalización o incorporación de nuevas funcionalidades podrán estar sujetas a evaluación técnica y condiciones particulares de servicio."],
    ["h", "XIII. Propiedad intelectual"],
    ["p", "Los sistemas SCaD, incluyendo su estructura tecnológica, código, interfaces, diseños, componentes y funcionalidades originales, constituyen desarrollos cuya titularidad o derechos de explotación corresponden a la ET o a sus respectivos titulares."],
    ["p", "La autorización de acceso concede un derecho limitado de utilización de las herramientas, conforme a las condiciones aplicables. No implica transferencia de propiedad intelectual ni autorización para reproducir, distribuir, comercializar, modificar o explotar sus componentes sin autorización."],
    ["p", "La información, documentos y contenidos incorporados por el EO conservarán la titularidad que legalmente corresponda a sus respectivos propietarios."],
    ["h", "XIV. Uso indebido y suspensión del servicio"],
    ["p", "La ET podrá adoptar medidas razonables para proteger la integridad y seguridad de la plataforma cuando identifique accesos no autorizados, utilización fraudulenta, alteraciones indebidas, riesgos tecnológicos o incumplimientos graves de estas condiciones."],
    ["p", "Estas medidas podrán incluir restricciones temporales, suspensión de funcionalidades o bloqueo de accesos. Cuando las circunstancias lo permitan, se informará al EO correspondiente sobre las causas de la medida y los mecanismos disponibles para su aclaración. Las medidas deberán guardar proporción con la naturaleza del incumplimiento o riesgo identificado."],
    ["h", "XV. Terminación del servicio"],
    ["p", "El uso de los sistemas SCaD podrá concluir por decisión del EO, vencimiento de una contratación, cancelación de una suscripción, incumplimiento de condiciones o terminación de la disponibilidad de un servicio."],
    ["p", "Al concluir la relación de servicio podrán deshabilitarse los accesos y funcionalidades correspondientes."],
    ["p", "La conservación, recuperación, exportación o eliminación de registros estará sujeta a las características técnicas del sistema, los acuerdos aplicables y las obligaciones legales correspondientes. La ET no asume una obligación general de almacenamiento indefinido de la información operativa."],
    ["p", "Cuando proceda, el EO deberá realizar oportunamente las acciones necesarias para conservar los registros y documentos que requiera."],
    ["h", "XVI. Limitación de responsabilidades"],
    ["p", "La ET será responsable de las obligaciones que expresamente le correspondan como proveedora tecnológica, conforme a los acuerdos celebrados y la legislación aplicable."],
    ["p", "No será responsable de las decisiones administrativas, laborales, comerciales u operativas adoptadas por el EO o sus usuarios, ni de la veracidad de los datos que estos incorporen a los sistemas."],
    ["p", "Tampoco asumirá obligaciones propias de servicios profesionales, supervisión presencial, certificación, asesoría especializada o ejecución material de actividades, salvo contratación expresa."],
    ["p", "Ninguna disposición de estas condiciones deberá interpretarse como una exclusión de responsabilidades que legalmente no puedan limitarse."],
    ["h", "XVII. Condiciones particulares"],
    ["p", "Por su diversidad funcional, algunos sistemas SCaD podrán establecer condiciones adicionales relacionadas con sus características específicas. Estas condiciones podrán comprender reglas de participación, modalidades de operación, requisitos técnicos, servicios especializados, licencias, suscripciones o procedimientos particulares."],
    ["p", "Cuando existan condiciones específicas, deberán comunicarse a los usuarios correspondientes y se aplicarán de manera complementaria a las presentes disposiciones generales. En caso de contradicción, prevalecerán las condiciones particulares válidamente acordadas respecto de la materia específica que regulen, sin perjuicio de las disposiciones legales obligatorias."],
    ["h", "XVIII. Modificación de las condiciones del servicio"],
    ["p", "La ET podrá actualizar estas Condiciones del Servicio para reflejar cambios tecnológicos, operativos, comerciales o normativos. Las versiones actualizadas estarán disponibles a través de los medios institucionales de SCaD."],
    ["p", "Cuando los cambios sean sustanciales, se informará a los usuarios o entes operativos afectados y, cuando legalmente corresponda, se solicitará su aceptación. La continuación del uso de los servicios después de una actualización no sustituirá los mecanismos de consentimiento que sean legalmente exigibles."],
    ["h", "XIX. Legislación aplicable"],
    ["p", "Las presentes condiciones se interpretarán conforme a las disposiciones legales aplicables en los Estados Unidos Mexicanos. Las controversias relacionadas con la prestación o utilización de los servicios se atenderán conforme a la naturaleza de la relación jurídica correspondiente, los acuerdos celebrados entre las partes y las disposiciones legales aplicables."],
    ["p", "Se respetarán en todo momento los derechos irrenunciables que correspondan a los usuarios o consumidores."],
    ["h", "XX. Contacto institucional"],
    ["p", "Para consultas relacionadas con estas Condiciones del Servicio, funcionamiento de los sistemas o aspectos técnicos de la plataforma:"],
    ["l", "Empresa Técnica: JM OPERADOR INTEGRAL EN SERVICIOS Y SOLUCIONES, S.A. DE C.V."],
    ["l", "Domicilio: Villa de las Ramas 107, Villas de Elguera, Celaya, Guanajuato, México."],
    ["l", "Correo electrónico: logcontrol@scad.mx"],
    ["l", "Sitio institucional: www.scad.mx"]
  ]
};

const DOCUMENTOS = { privacidad: PRIVACIDAD, condiciones: CONDICIONES };

// HTML del modal. Las listas se agrupan para mantener el orden del documento.
export function documentoLegal(clave) {
  const d = DOCUMENTOS[clave];
  if (!d) return "";
  let html = "", enLista = false;
  for (const [tipo, texto] of d.lineas) {
    if (tipo === "l" && !enLista) { html += `<ul class="legal-lista">`; enLista = true; }
    if (tipo !== "l" && enLista) { html += `</ul>`; enLista = false; }
    if (tipo === "h") html += `<h4 class="legal-h">${esc(texto)}</h4>`;
    else if (tipo === "l") html += `<li>${esc(texto)}</li>`;
    else html += `<p class="legal-p">${esc(texto)}</p>`;
  }
  if (enLista) html += `</ul>`;
  return `<div class="legal"><h3>${esc(d.titulo)}</h3><p class="legal-sub">${esc(d.subtitulo)}</p>${html}</div>`;
}
