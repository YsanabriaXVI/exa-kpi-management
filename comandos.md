Para trabajar específicamente con exa-kpi-management-service, entra primero al directorio del backend:

  cd backend

  ### Levantar y revisar los contenedores

  # Levantar MySQL y exa-kpi-management-service
  docker compose up -d --build

  # Ver los contenedores de este compose
  docker compose ps

  # Ver todos los contenedores activos
  docker ps

  # Ver también los detenidos
  docker ps -a

  ### Logs del servicio

  # Seguir los logs en tiempo real
  docker compose logs -f exa-kpi-management-service

  # Últimas 100 líneas
  docker compose logs --tail 100 exa-kpi-management-service

  # Logs de MySQL
  docker compose logs -f mysql

  Para salir del seguimiento de logs: Ctrl+C.

  ### Entrar al contenedor del servicio

  docker compose exec exa-kpi-management-service sh

  Ya dentro puedes ejecutar:

  npm run typecheck
  npm test
  npm run prisma:validate
  npm run prisma:migrate:deploy
  npm run prisma:seed
  npm run prisma:import:kpi-definitions
  npm run prisma:import:kpi-configurations

  También pueden ejecutarse directamente desde PowerShell:

  docker compose exec exa-kpi-management-service npm run typecheck
  docker compose exec exa-kpi-management-service npm test
  docker compose exec exa-kpi-management-service npm run prisma:validate

  ### Entrar a MySQL

  Con el usuario de la aplicación:

  docker compose exec mysql mysql -u exa_kpi_management -pexa_kpi_dev exa_kpi_management

  Como root:

  docker compose exec mysql mysql -u root -pexa_root_dev

  ### Consultar bases de datos, tablas y registros

  Una vez dentro de MySQL:

  SHOW DATABASES;

  USE exa_kpi_management;

  SHOW TABLES;

  DESCRIBE nombre_de_tabla;

  SHOW COLUMNS FROM nombre_de_tabla;

  SELECT * FROM nombre_de_tabla LIMIT 20;

  SELECT COUNT(*) FROM nombre_de_tabla;

  SELECT * FROM nombre_de_tabla
  ORDER BY id DESC
  LIMIT 20;

  También puedes ejecutar consultas sin entrar a la consola interactiva:

  docker compose exec mysql mysql -u exa_kpi_management -pexa_kpi_dev -D exa_kpi_management -e "SHOW TABLES;"

  docker compose exec mysql mysql -u exa_kpi_management -pexa_kpi_dev -D exa_kpi_management -e "SELECT * FROM nombre_de_tabla LIMIT 20;"

  docker compose exec mysql mysql -u exa_kpi_management -pexa_kpi_dev -D exa_kpi_management -e "DESCRIBE nombre_de_tabla;"

  ### Abrir Adminer

  El contenedor de Adminer pertenece al perfil tools:

  docker compose --profile tools up -d adminer

  Luego abre:

  http://localhost:8080

  Credenciales:

  Sistema:    MySQL
  Servidor:   mysql
  Usuario:    exa_kpi_management
  Contraseña: exa_kpi_dev
  Base:       exa_kpi_management

  ### Reiniciar o reconstruir solamente el servicio

  # Reiniciar
  docker compose restart exa-kpi-management-service

  # Reconstruir y levantar nuevamente
  docker compose up -d --build exa-kpi-management-service

  # Detener solamente el servicio
  docker compose stop exa-kpi-management-service

  # Levantar solamente el servicio
  docker compose up -d exa-kpi-management-service

  ### Detener el entorno

  # Detener y eliminar contenedores, conservando la base de datos
  docker compose down

  No uses docker compose down -v salvo que quieras borrar también el volumen y todos los datos de MySQL.


  • El conflicto ocurre porque ambos archivos docker-compose.yml intentan crear un contenedor llamado exa-kpi-mysql. Ya existe uno creado desde el Compose raíz.

  Si quieres usar específicamente exa-kpi-management-service, ejecuta desde la raíz del proyecto:

  # Ver qué Compose creó el contenedor existente
  docker inspect exa-kpi-mysql --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'

  Después, apaga el Compose de la raíz sin borrar los datos:

  docker compose down

  Y levanta el Compose correcto del backend:

  cd backend
  docker compose up -d --build
  docker compose ps

  Si el contenedor sigue existiendo porque quedó huérfano, elimínalo de forma explícita:

  docker stop exa-kpi-mysql
  docker rm exa-kpi-mysql

  Luego vuelve a levantar:

  docker compose up -d --build

  Esto elimina solamente el contenedor, no el volumen de MySQL. Evita docker compose down -v, porque -v sí elimina los datos persistidos.

  Para comprobar que quedó funcionando:

  docker compose ps
  docker compose logs --tail 100 mysql
  Finalmente, consulta las tablas con:

› como hago para consultar algo del microservicio de KPIs?



El microservicio queda disponible en http://localhost:4001. Puedes consultar sus endpoints desde PowerShell.

  Primero verifica que esté funcionando:

  docker compose ps
  Invoke-RestMethod http://localhost:4001/api/health/live
  Invoke-RestMethod http://localhost:4001/api/health/ready

  Consultar KPIs:

  # Listar definiciones de KPI
  Invoke-RestMethod http://localhost:4001/api/v1/kpi-definitions

  # Consultar el KPI con ID 1
  Invoke-RestMethod http://localhost:4001/api/v1/kpi-definitions/1

  # Buscar KPIs
  Invoke-RestMethod "http://localhost:4001/api/v1/kpi-definitions?search=tiempo"

  # Filtrar por estado
  Invoke-RestMethod "http://localhost:4001/api/v1/kpi-definitions?status=ACTIVE"

  # Paginar resultados
  Invoke-RestMethod "http://localhost:4001/api/v1/kpi-definitions?page=1&pageSize=10"

  # Ordenar
  Invoke-RestMethod "http://localhost:4001/api/v1/kpi-definitions?sortBy=kpiName&sortOrder=asc"

  # Consultar las configuraciones del KPI 1
  Invoke-RestMethod http://localhost:4001/api/v1/kpi-definitions/1/configurations

  Otros catálogos:

  # Categorías de KPI
  Invoke-RestMethod http://localhost:4001/api/v1/kpi-categories

  # Configuraciones
  Invoke-RestMethod http://localhost:4001/api/v1/kpi-configurations

  # Configuración con ID 1
  Invoke-RestMethod http://localhost:4001/api/v1/kpi-configurations/1

  Para visualizar mejor el JSON:

  Invoke-RestMethod http://localhost:4001/api/v1/kpi-definitions |
      ConvertTo-Json -Depth 10

  También puedes usar Swagger desde el navegador:

  http://localhost:4001/api/docs

  Ahí podrás ver y probar todos los endpoints con el botón Try it out.

  Si la consulta falla, revisa los logs:

  docker compose logs --tail 100 exa-kpi-management-service

  Y confirma que el puerto esté publicado como 4001:4001:

  docker compose ps exa-kpi-management-service






--- Pool KPIS


 Claro :) Ejecuta estos comandos desde la raíz del proyecto:

  C:\Users\ODC2\Desktop\exa-kpi-system-starter\exa-kpi-system

  ## Levantar los contenedores

  docker compose -f backend/docker-compose.yml up -d

  Reconstruir antes de levantarlos:

  docker compose -f backend/docker-compose.yml up -d --build

  Levantar únicamente Pool, NATS y sus dependencias:

  docker compose -f backend/docker-compose.yml up -d mysql nats exa-kpi-pool-service

  ## Consultar estado

  docker compose -f backend/docker-compose.yml ps

  Incluyendo contenedores detenidos:

  docker compose -f backend/docker-compose.yml ps -a

  Estado directo de cada contenedor:

  docker inspect --format "{{.Name}} -> {{.State.Status}} | Health: {{if .State.Health}}{{.State.Health.Status}}{{else}}N/A{{end}}" exa-kpi-mysql exa-kpi-nats exa-kpi-
  management-service exa-kpi-pool-service

  ## Consultar logs

  Pool Service:

  docker compose -f backend/docker-compose.yml logs -f --tail=100 exa-kpi-pool-service

  NATS:

  docker compose -f backend/docker-compose.yml logs -f --tail=100 nats

  MySQL:

  docker compose -f backend/docker-compose.yml logs -f --tail=100 mysql

  Todos:

  docker compose -f backend/docker-compose.yml logs -f --tail=100

  Para salir del seguimiento de logs usa Ctrl+C; los contenedores continuarán activos.

  ## Health del Pool Service

  Invoke-RestMethod http://localhost:4002/api/health/live | ConvertTo-Json -Depth 10

  Invoke-RestMethod http://localhost:4002/api/health/ready | ConvertTo-Json -Depth 10

  También puedes usar curl.exe:

  curl.exe http://localhost:4002/api/health/live
  curl.exe http://localhost:4002/api/health/ready

  ## Swagger

  Abrir manualmente en el navegador:

  http://localhost:4002/api/docs

  Consultar el OpenAPI:

  Invoke-RestMethod http://localhost:4002/api/docs/openapi.json | ConvertTo-Json -Depth 20

  ## Estado de KPI Management

  Invoke-RestMethod http://localhost:4001/api/health/live | ConvertTo-Json -Depth 10

  Invoke-RestMethod http://localhost:4001/api/health/ready | ConvertTo-Json -Depth 10

  ## Estado de NATS y JetStream

  Health:

  Invoke-RestMethod http://localhost:8222/healthz | ConvertTo-Json

  Información general de JetStream:

  Invoke-RestMethod "http://localhost:8222/jsz?streams=true&config=true" | ConvertTo-Json -Depth 20

  Información del servidor NATS:

  Invoke-RestMethod http://localhost:8222/varz | ConvertTo-Json -Depth 10

  ## Entrar a MySQL como usuario del Pool

  docker exec -it exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev exa_kpi_pool

  Ya dentro de MySQL:

  SHOW TABLES;

  SELECT DATABASE();

  SHOW TABLE STATUS;

  Salir:

  exit;

  ## Consultar tablas del Pool directamente

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SHOW TABLES;"

  Estructura de una tabla:

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "DESCRIBE kpi_pools;"

  Consultar registros:

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SELECT * FROM kpi_pools;"

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SELECT * FROM pool_areas;"

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SELECT * FROM company_references;"

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SELECT * FROM input_frequency_references;"

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SELECT * FROM outbox_events ORDER BY occurred_at DESC;"

  Es normal que esas tablas estén vacías: todavía no implementamos CRUD ni insertamos catálogos no aprobados.

  ## Verificar migraciones

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -D exa_kpi_pool -e "SELECT migration_name, finished_at FROM _prisma_migrations;"

  ## Verificar las FK físicas

  docker exec exa-kpi-mysql mysql -uexa_kpi_pool -pexa_pool_dev -N -e "SELECT table_name, constraint_name, referenced_table_schema, referenced_table_name FROM
  information_schema.key_column_usage WHERE table_schema='exa_kpi_pool' AND referenced_table_name IS NOT NULL ORDER BY table_name;"

  Todas deberían apuntar a exa_kpi_pool, nunca a exa_kpi_management.

  ## Reiniciar solamente Pool Service

  docker compose -f backend/docker-compose.yml restart exa-kpi-pool-service

  Reconstruir solamente Pool Service:

  docker compose -f backend/docker-compose.yml up -d --build exa-kpi-pool-service

  ## Detener sin borrar datos

  docker compose -f backend/docker-compose.yml stop

  O detener y remover contenedores/red, conservando volúmenes:

  docker compose -f backend/docker-compose.yml down

  No uses docker compose down -v, porque -v eliminaría los volúmenes persistentes de MySQL y JetStream.