-- `fixed` n'est plus lu ni écrit (remplacé par `status`) : on retire la contrainte qui les liait.
-- La colonne et son index sont supprimés dans une migration ultérieure, une fois ce code déployé partout.
ALTER TABLE "warning" DROP CONSTRAINT "warning_status_fixed_check";
