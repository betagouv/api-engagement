import Table from "./NewTable";
import Pagination from "./Pagination";

const TablePagination = ({ page, onPageChange, total, pageSize = 10, children, ...props }) => {
  return (
    <div className="space-y-6">
      <Table total={total} {...props}>
        {children}
      </Table>
      <Pagination page={page} setPage={onPageChange} end={Math.ceil(total / pageSize) || 1} />
    </div>
  );
};

export default TablePagination;
