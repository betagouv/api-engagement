import { useEffect, useState } from "react";
import { RiAddFill, RiDeleteBin6Line } from "react-icons/ri";

import Autocomplete from "@/components/Autocomplete";

const QueryBuilder = ({ fields, rules, setRules, onSearch }) => {
  const handleAddRule = () => {
    setRules([...rules, { combinator: "and", field: fields[0].value, operator: "is", value: "" }]);
  };

  const handleDeleteRule = (index) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const handleRuleChange = (rule, index) => {
    const newRules = [...rules];
    newRules[index] = rule;
    setRules(newRules);
  };

  return (
    <div className="flex flex-col">
      {rules.map((r, i) => (
        <div key={i} className="my-3 flex w-full items-center gap-4">
          <Rule index={i} fields={fields} rule={r} onChange={(r) => handleRuleChange(r, i)} onSearch={onSearch} />
          <span className="flex h-8 w-8 cursor-pointer items-center justify-center border border-red-main text-red-main" onClick={() => handleDeleteRule(i)}>
            <RiDeleteBin6Line />
          </span>
        </div>
      ))}
      <span className="flex cursor-pointer w-fit items-center border border-blue-dark p-2 mt-2 text-blue-dark" onClick={handleAddRule}>
        Ajouter un filtre
        <RiAddFill className="ml-2" />
      </span>
    </div>
  );
};

const Rule = ({ fields, rule, onChange, onSearch, index }) => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await onSearch(rule.field, rule.value);
      setOptions(res.map((option) => ({ label: option.key, value: option.key })));
    };
    fetchData();
  }, []);

  const handleSelect = (option) => {
    onChange({ ...rule, value: option ? option.value : "" });
    setOptions([]);
  };

  const handleChange = async (value) => {
    onChange({ ...rule, value });
    const res = await onSearch(rule.field, value);
    setOptions(res.map((option) => ({ label: option.key, value: option.key })));
  };

  const handleSelectField = (e) => {
    const f = fields.find((f) => f.value === e.target.value);
    if (!f) return;
    if (f.type === "boolean") onChange({ ...rule, field: f.value, fieldType: f.type, operator: "is", value: "yes" });
    else onChange({ ...rule, field: f.value, fieldType: f.type });
  };

  return (
    <div className="flex w-full items-center gap-4">
      {index > 0 ? (
        <select className="select w-[6%] px-2" value={rule.combinator} onChange={(e) => onChange({ ...rule, combinator: e.target.value })}>
          <option value="and">Et</option>
          <option value="or">Ou</option>
        </select>
      ) : (
        <div className="w-[6%]" />
      )}
      <div className="flex w-full items-center gap-4">
        <select className={`select w-[35%]`} value={rule.field} onChange={handleSelectField}>
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {rule.fieldType === "boolean" ? (
          <>
            <select className="select w-[15%]" defaultValue={rule.operator} disabled>
              <option value="is">égal à</option>
            </select>
            <select className="select flex-1" value={rule.value} onChange={(e) => onChange({ ...rule, value: e.target.value })}>
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </select>
          </>
        ) : (
          <>
            <select className="select w-[15%]" value={rule.operator} onChange={(e) => onChange({ ...rule, operator: e.target.value })}>
              <option value="is">égal à</option>
              <option value="is_not">différent de</option>
              <option value="contains">contient</option>
              <option value="does_not_contain">ne contient pas</option>
              <option value="is_greater_than">plus grand que</option>
              <option value="is_less_than">plus petit que</option>
              <option value="exists">existe</option>
              <option value="does_not_exist">n'existe pas</option>
              <option value="starts_with">commence par</option>
            </select>
            {rule.operator !== "exists" && rule.operator !== "does_not_exist" && (
              <div className="flex-1">
                <Autocomplete options={options} value={rule.value} onChange={handleChange} onSelect={handleSelect} placeholder="Choisissez une option" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QueryBuilder;
