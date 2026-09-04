CREATE TABLE `kpi_configuration_subject_catalog` (
  `kpi_configuration_subject_catalog_id` BIGINT NOT NULL AUTO_INCREMENT,
  `subject_type` VARCHAR(30) NOT NULL,
  `external_id` VARCHAR(100) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kpi_configuration_subject_catalog_id`),
  UNIQUE KEY `uq_kpi_configuration_subject_catalog_external` (`subject_type`, `external_id`),
  UNIQUE KEY `uq_kpi_configuration_subject_catalog_code` (`subject_type`, `code`),
  KEY `ix_kpi_configuration_subject_catalog_lookup` (`subject_type`, `is_active`, `display_order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `kpi_configuration_subject_catalog` (`subject_type`,`external_id`,`code`,`name`,`display_order`) VALUES
('FLEET','fleet:flota-nueva','FLEET-NEW','Flota Nueva',1),('FLEET','fleet:tranexpa','TRANEXPA','TRANEXPA',2),('FLEET','fleet:iph','IPH','IPH',3),('FLEET','fleet:particulares','PRIVATE','Particulares',4),('FLEET','fleet:ponce','PONCE','Ponce',5),('FLEET','fleet:moreno','MORENO','Moreno',6),('FLEET','fleet:obregon','OBREGON','Obregón',7),('FLEET','fleet:san-lorenzo','SAN-LORENZO','San Lorenzo',8),('FLEET','fleet:sinai','SINAI','Sinai',9),
('EMPLOYEE','collaborator:jacky-mena','JACKY-MENA','Jacky Mena',1),('EMPLOYEE','collaborator:nancy-garcia','NANCY-GARCIA','Nancy García',2),('EMPLOYEE','collaborator:carlos','CARLOS','Carlos',3),('EMPLOYEE','collaborator:ana','ANA','Ana',4),
('CUSTOMER','customer:cliente-a','CUSTOMER-A','Cliente A',1),('CUSTOMER','customer:cliente-b','CUSTOMER-B','Cliente B',2),('CUSTOMER','customer:cliente-c','CUSTOMER-C','Cliente C',3),
('LOCATION','location:puerto-cortes','PUERTO-CORTES','Puerto Cortés',1),('LOCATION','location:san-lorenzo','SAN-LORENZO','San Lorenzo',2),('LOCATION','location:predio','PREDIO','Predio',3),('LOCATION','location:san-pedro-sula','SAN-PEDRO-SULA','San Pedro Sula',4),('LOCATION','location:comayagua','COMAYAGUA','Comayagua',5),('LOCATION','location:tegucigalpa','TEGUCIGALPA','Tegucigalpa',6),
('OPERATION','operation:import','IMPORT','Import',1),('OPERATION','operation:export','EXPORT','Export',2),('OPERATION','operation:empty-return','EMPTY-RETURN','Empty Return',3),('OPERATION','operation:local','LOCAL','Local',4),('OPERATION','operation:transshipment','TRANSSHIPMENT','Transshipment',5),
('PROJECT','project:fleet-modernization','FLEET-MOD','Modernización de Flota',1),('PROJECT','project:puerto-cortes-expansion','PC-EXPANSION','Expansión Puerto Cortés',2),('PROJECT','project:ems-integration','EMS-INTEGRATION','Integración EMS',3),
('ASSET','asset:cabezales','CABEZAL','Cabezales',1),('ASSET','asset:gensets','GENSET','Gensets',2),('ASSET','asset:containers','CONTAINER','Contenedores',3),('ASSET','asset:equipment','EQUIPMENT','Equipos',4);
