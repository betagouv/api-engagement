import { IoIosArrowDown } from "react-icons/io";

import Loader from "./Loader";

const Table = ({ header, sortBy, total, onSort, loading, children, auto = false, sticky = false, className = "h-full" }) => {
  return (
    <div className={`w-full overflow-x-auto no-scrollbar ${className}`}>
      <table className={`w-full ${auto ? "table-auto" : "table-fixed"}`}>
        <thead className={`text-left ${sticky ? "sticky top-0 z-10 shadow-sm" : ""}`}>
          <tr className="table-header">
            {header.map((item, index) => {
              return (
                <th key={index} className="p-4" colSpan={item.colSpan || 1}>
                  <button
                    className={`group flex items-center gap-2 w-full ${item.position === "right" ? "justify-end" : item.position === "center" ? "justify-center" : "justify-start"}`}
                    onClick={() => item.key && onSort && onSort(item.key)}
                  >
                    <div className="relative">
                      <h3 className={`text-sm font-semibold ${item.position === "right" ? "text-right" : item.position === "center" ? "text-center" : "text-left"}`}>
                        {item.title}
                        {item.key && onSort && (
                          <IoIosArrowDown className={`${sortBy === item.key ? "block" : "hidden group-hover:block"} absolute -right-4 top-1/2 -translate-y-1/2`} />
                        )}
                      </h3>
                    </div>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="relative">
          {loading ? (
            <tr>
              <td colSpan={header.reduce((acc, item) => acc + (item.colSpan || 1), 0)}>
                <div className="py-4 flex w-full justify-center bg-gray-50">
                  <Loader />
                </div>
              </td>
            </tr>
          ) : total === 0 ? (
            <tr>
              <td colSpan={header.reduce((acc, item) => acc + (item.colSpan || 1), 0)} className="py-4 text-center bg-gray-50">
                Aucune donnée trouvée
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
