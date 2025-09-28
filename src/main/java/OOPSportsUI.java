// OOPSportsUI.java
// ระบบยืม-คืนอุปกรณ์กีฬา — 3 แท็บ: ยืม/คืน | จัดการอุปกรณ์กีฬา | บันทึกการยืม-คืน

import javafx.application.Application;
import javafx.beans.property.*;
import javafx.collections.*;
import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.*;
import javafx.stage.Stage;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/* ========================= MODELS ========================= */
abstract class Equipment {
    private final int id;
    private final String name;
    private int totalStock;
    private int available;

    protected Equipment(int id, String name, int stock) {
        if (stock < 0) throw new IllegalArgumentException("stock >= 0");
        this.id = id;
        this.name = Objects.requireNonNull(name);
        this.totalStock = stock;
        this.available = stock;
    }
    public final int getId() { return id; }
    public final String getName() { return name; }
    public final int getTotalStock() { return totalStock; }
    public final int getAvailable() { return available; }
    public final int getBorrowed() { return totalStock - available; }

    public final void addStock(int qty){
        if (qty<=0) throw new IllegalArgumentException("qty > 0");
        totalStock += qty; available += qty;
    }
    public final void removeStock(int qty){
        if (qty<=0) throw new IllegalArgumentException("qty > 0");
        if (qty>totalStock) throw new IllegalArgumentException("ลดเกินสต็อก");
        int borrowed = getBorrowed();
        if (totalStock - qty < borrowed) throw new IllegalStateException("ลดจนต่ำกว่าของที่ยืมค้าง");
        totalStock -= qty; available = totalStock - borrowed;
    }

    public final boolean borrow(String actor,int qty){
        if (qty<=0) return false;
        if (!allowBorrow(actor,qty)) return false;
        if (qty>available) return false;
        available -= qty; return true;
    }
    public final void giveBack(int qty){
        if (qty<=0) throw new IllegalArgumentException("qty > 0");
        if (available + qty > totalStock) throw new IllegalStateException("คืนเกินจำนวนที่ยืมค้าง");
        available += qty; afterGiveBack(qty);
    }

    protected boolean allowBorrow(String actor,int qty){ return true; }
    protected void afterGiveBack(int qty){}

    public abstract String category();
    public abstract int depositPerItem();

    @Override public String toString(){
        return String.format("#%d [%s] %s | total=%d available=%d", id, category(), name, totalStock, available);
    }
}
class Ball extends Equipment {
    public Ball(int id,String name,int stock){ super(id,name,stock); }
    @Override public String category(){ return "Ball"; }
    @Override public int depositPerItem(){ return 50; }
    @Override protected boolean allowBorrow(String actor,int qty){ return qty<=3; }
}
class Racket extends Equipment {
    public Racket(int id,String name,int stock){ super(id,name,stock); }
    @Override public String category(){ return "Racket"; }
    @Override public int depositPerItem(){ return 100; }
    @Override protected boolean allowBorrow(String actor,int qty){ return qty<=2; }
}
class ProtectiveGear extends Equipment {
    public ProtectiveGear(int id,String name,int stock){ super(id,name,stock); }
    @Override public String category(){ return "Protective"; }
    @Override public int depositPerItem(){ return 30; }
    @Override protected boolean allowBorrow(String actor,int qty){ return qty%2==0; }
}

/* ========================= REPO + SERVICE ========================= */
class EquipmentRepository {
    private final Map<Integer,Equipment> store = new LinkedHashMap<>();
    private int nextId = 1001;
    int nextId(){ return nextId++; }
    <T extends Equipment> T saveNew(T e){ store.put(e.getId(),e); return e; }
    Optional<Equipment> findById(int id){ return Optional.ofNullable(store.get(id)); }
    List<Equipment> findAll(){ return new ArrayList<>(store.values()); }
    List<Equipment> searchByName(String kw){
        kw = (kw==null?"":kw).toLowerCase(Locale.ROOT);
        var out = new ArrayList<Equipment>();
        for (var e: store.values()) if (e.getName().toLowerCase(Locale.ROOT).contains(kw)) out.add(e);
        return out;
    }
    boolean delete(int id){ return store.remove(id)!=null; }
}
enum LogType { BORROW, RETURN, ADJUST_ADD, ADJUST_REMOVE, CREATE_ITEM, DELETE_ITEM }
class LogEntry {
    private final LocalDateTime at = LocalDateTime.now();
    private final String actor; private final LogType type; private final int equipmentId; private final int qty; private final String note;
    LogEntry(String actor, LogType type, int equipmentId, int qty, String note){
        this.actor=actor; this.type=type; this.equipmentId=equipmentId; this.qty=qty; this.note=note;
    }
    String timeText(){ return at.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")); }
    String typeText(){ return type.toString(); }
    String actorText(){ return actor; }
    int itemId(){ return equipmentId; }
    int qtyVal(){ return qty; }
    String noteText(){ return note; }
}
class AuditService {
    private final List<LogEntry> logs = new ArrayList<>();
    void record(LogEntry e){ logs.add(e); }
    List<LogEntry> all(){ return Collections.unmodifiableList(logs); }
}
class BorrowService {
    private final EquipmentRepository repo; private final AuditService audit;
    BorrowService(EquipmentRepository r, AuditService a){ repo=r; audit=a; }
    String borrow(String actor,int id,int qty){
        var e = repo.findById(id).orElse(null); if (e==null) return "ไม่พบอุปกรณ์";
        if (!e.borrow(actor,qty)) return "ยืมไม่ได้ (เหลือ "+e.getAvailable()+" หรือไม่ผ่านกฎ "+e.category()+")";
        audit.record(new LogEntry(actor,LogType.BORROW,id,qty,"borrow '"+e+"'"));
        return "ยืมสำเร็จ | มัดจำรวม "+(e.depositPerItem()*qty)+" บาท";
    }
    String giveBack(String actor,int id,int qty){
        var e = repo.findById(id).orElse(null); if (e==null) return "ไม่พบอุปกรณ์";
        try{ e.giveBack(qty); audit.record(new LogEntry(actor,LogType.RETURN,id,qty,"return '"+e+"'")); return "คืนสำเร็จ"; }
        catch(Exception ex){ return "คืนไม่ได้: "+ex.getMessage(); }
    }
    Optional<String> findItemName(int id){
        return repo.findById(id).map(Equipment::getName);
    }
}
class AdminService {
    private final EquipmentRepository repo; private final AuditService audit;
    AdminService(EquipmentRepository r, AuditService a){ repo=r; audit=a; }
    Equipment addItem(String actor,String type,String name,int stock){
        if (stock<0) throw new IllegalArgumentException("stock >= 0");
        int id = repo.nextId();
        Equipment e = switch (type){
            case "Ball" -> new Ball(id,name,stock);
            case "Racket" -> new Racket(id,name,stock);
            case "Protective" -> new ProtectiveGear(id,name,stock);
            default -> throw new IllegalArgumentException("type ไม่ถูกต้อง");
        };
        repo.saveNew(e); audit.record(new LogEntry(actor,LogType.CREATE_ITEM,e.getId(),stock,"create '"+name+"'")); return e;
    }
    boolean deleteItem(String actor,int id){ boolean ok=repo.delete(id); if(ok) audit.record(new LogEntry(actor,LogType.DELETE_ITEM,id,0,"delete")); return ok; }
    String addStock(String actor,int id,int qty){ var e=repo.findById(id).orElse(null); if(e==null) return "ไม่พบอุปกรณ์"; if(qty<=0) return "qty > 0"; e.addStock(qty); audit.record(new LogEntry(actor,LogType.ADJUST_ADD,id,qty,"add stock")); return "เพิ่มสต็อกแล้ว"; }
    String removeStock(String actor,int id,int qty){ var e=repo.findById(id).orElse(null); if(e==null) return "ไม่พบอุปกรณ์"; try{ e.removeStock(qty);}catch(Exception ex){return "ลบสต็อกไม่ได้: "+ex.getMessage();} audit.record(new LogEntry(actor,LogType.ADJUST_REMOVE,id,qty,"remove stock")); return "ลดสต็อกแล้ว"; }
    List<LogEntry> logs(){ return audit.all(); }
    List<Equipment> list(String kw){ return (kw==null||kw.isBlank())?repo.findAll():repo.searchByName(kw); }
}

/* ========================= VIEW MODELS ========================= */
class EquipmentRow {
    private final IntegerProperty id = new SimpleIntegerProperty();
    private final StringProperty category = new SimpleStringProperty();
    private final StringProperty name = new SimpleStringProperty();
    private final IntegerProperty total = new SimpleIntegerProperty();
    private final IntegerProperty available = new SimpleIntegerProperty();
    EquipmentRow(Equipment e){ set(e); }
    void set(Equipment e){ id.set(e.getId()); category.set(e.category()); name.set(e.getName()); total.set(e.getTotalStock()); available.set(e.getAvailable()); }
    public int getId(){ return id.get(); } public String getCategory(){ return category.get(); } public String getName(){ return name.get(); }
    public int getTotal(){ return total.get(); } public int getAvailable(){ return available.get(); }
    public IntegerProperty idProperty(){ return id; } public StringProperty categoryProperty(){ return category; } public StringProperty nameProperty(){ return name; }
    public IntegerProperty totalProperty(){ return total; } public IntegerProperty availableProperty(){ return available; }
}
class LogRow {
    private final StringProperty time = new SimpleStringProperty();
    private final StringProperty type = new SimpleStringProperty();
    private final StringProperty actor = new SimpleStringProperty();
    private final IntegerProperty itemId = new SimpleIntegerProperty();
    private final IntegerProperty qty = new SimpleIntegerProperty();
    private final StringProperty note = new SimpleStringProperty();
    LogRow(LogEntry e){
        time.set(e.timeText()); type.set(e.typeText()); actor.set(e.actorText());
        itemId.set(e.itemId()); qty.set(e.qtyVal()); note.set(e.noteText());
    }
    public String getTime(){ return time.get(); } public String getType(){ return type.get(); } public String getActor(){ return actor.get(); }
    public int getItemId(){ return itemId.get(); } public int getQty(){ return qty.get(); } public String getNote(){ return note.get(); }
    public StringProperty timeProperty(){ return time; } public StringProperty typeProperty(){ return type; } public StringProperty actorProperty(){ return actor; }
    public IntegerProperty itemIdProperty(){ return itemId; } public IntegerProperty qtyProperty(){ return qty; } public StringProperty noteProperty(){ return note; }
}

/* --------- แถวสำหรับ “บันทึกการยืม-คืน” --------- */
class TxRow {
    private final StringProperty studentId = new SimpleStringProperty();
    private final StringProperty item = new SimpleStringProperty();
    private final IntegerProperty qty = new SimpleIntegerProperty();
    private final StringProperty borrowAt = new SimpleStringProperty();
    private final StringProperty returnAt = new SimpleStringProperty();

    TxRow(String sid, String item, int qty, LocalDateTime bAt, LocalDateTime rAt){
        studentId.set(sid);
        this.item.set(item);
        this.qty.set(qty);
        borrowAt.set(fmt(bAt));
        returnAt.set(rAt==null ? "" : fmt(rAt));
    }
    static String fmt(LocalDateTime dt){ return dt==null? "" : dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")); }

    public String getStudentId(){ return studentId.get(); }
    public String getItem(){ return item.get(); }
    public int getQty(){ return qty.get(); }
    public String getBorrowAt(){ return borrowAt.get(); }
    public String getReturnAt(){ return returnAt.get(); }

    public void setReturnAt(LocalDateTime rt){ returnAt.set(fmt(rt)); }
    public boolean isOpen(){ return returnAt.get()==null || returnAt.get().isBlank(); }

    public StringProperty studentIdProperty(){ return studentId; }
    public StringProperty itemProperty(){ return item; }
    public IntegerProperty qtyProperty(){ return qty; }
    public StringProperty borrowAtProperty(){ return borrowAt; }
    public StringProperty returnAtProperty(){ return returnAt; }
}

/* ========================= JavaFX APP ========================= */
public class OOPSportsUI extends Application {
    private final EquipmentRepository repo = new EquipmentRepository();
    private final AuditService audit = new AuditService();
    private final BorrowService borrowService = new BorrowService(repo, audit);
    private final AdminService adminService = new AdminService(repo, audit);

    // ตารางใช้งานทั่วไป (ดูรายการอุปกรณ์) + ตารางบันทึกระบบ
    private final ObservableList<EquipmentRow> equipRows = FXCollections.observableArrayList();
    private final TableView<EquipmentRow> tableEquip = new TableView<>(equipRows);
    private final ObservableList<LogRow> logRows = FXCollections.observableArrayList();
    private final TableView<LogRow> tableLog = new TableView<>(logRows);

    // ตารางบันทึกการยืม-คืน
    private final ObservableList<TxRow> txRows = FXCollections.observableArrayList();
    private final TableView<TxRow> tableTx = new TableView<>(txRows);

    // ตารางสำหรับ “จัดการอุปกรณ์กีฬา” (หัวคอลัมน์ตามรูป)
    private final TableView<EquipmentRow> manageTable = new TableView<>(equipRows);

    /* ---------- seed + builders ---------- */
    private void seed(){
        adminService.addItem("seed","Ball","บอล",10);
        adminService.addItem("seed","Ball","บาส",10);
        adminService.addItem("seed","Ball","ลูกขนไก่",10);
        adminService.addItem("seed","Ball","วอลเลย์บอล",10);
        adminService.addItem("seed","Ball","เซปักตะกร้อ",10);
    }
    private void initEquipTable(){
        TableColumn<EquipmentRow,Integer> cId = new TableColumn<>("รหัส");
        cId.setCellValueFactory(new PropertyValueFactory<>("id")); cId.setPrefWidth(70);
        TableColumn<EquipmentRow,String> cCat = new TableColumn<>("หมวด");
        cCat.setCellValueFactory(new PropertyValueFactory<>("category")); cCat.setPrefWidth(110);
        TableColumn<EquipmentRow,String> cName = new TableColumn<>("อุปกรณ์");
        cName.setCellValueFactory(new PropertyValueFactory<>("name")); cName.setPrefWidth(300);
        TableColumn<EquipmentRow,Integer> cTotal = new TableColumn<>("รวม");
        cTotal.setCellValueFactory(new PropertyValueFactory<>("total")); cTotal.setPrefWidth(80);
        TableColumn<EquipmentRow,Integer> cAvail = new TableColumn<>("คงเหลือ");
        cAvail.setCellValueFactory(new PropertyValueFactory<>("available")); cAvail.setPrefWidth(90);
        tableEquip.getColumns().setAll(cId,cCat,cName,cTotal,cAvail);
        tableEquip.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
    }
    private void initLogTable(){
        TableColumn<LogRow,String> cTime = new TableColumn<>("เวลา");
        cTime.setCellValueFactory(new PropertyValueFactory<>("time")); cTime.setPrefWidth(160);
        TableColumn<LogRow,String> cType = new TableColumn<>("ประเภท");
        cType.setCellValueFactory(new PropertyValueFactory<>("type")); cType.setPrefWidth(110);
        TableColumn<LogRow,String> cActor = new TableColumn<>("ผู้ทำ");
        cActor.setCellValueFactory(new PropertyValueFactory<>("actor")); cActor.setPrefWidth(120);
        TableColumn<LogRow,Integer> cItem = new TableColumn<>("รหัส");
        cItem.setCellValueFactory(new PropertyValueFactory<>("itemId")); cItem.setPrefWidth(70);
        TableColumn<LogRow,Integer> cQty = new TableColumn<>("จำนวน");
        cQty.setCellValueFactory(new PropertyValueFactory<>("qty")); cQty.setPrefWidth(80);
        TableColumn<LogRow,String> cNote = new TableColumn<>("หมายเหตุ");
        cNote.setCellValueFactory(new PropertyValueFactory<>("note"));
        tableLog.getColumns().setAll(cTime,cType,cActor,cItem,cQty,cNote);
    }
    private void initTxTable(){
        TableColumn<TxRow,String> cSid = new TableColumn<>("student ID");
        cSid.setCellValueFactory(new PropertyValueFactory<>("studentId")); cSid.setPrefWidth(140);
        TableColumn<TxRow,String> cItem = new TableColumn<>("Item");
        cItem.setCellValueFactory(new PropertyValueFactory<>("item")); cItem.setPrefWidth(240);
        TableColumn<TxRow,Integer> cQty = new TableColumn<>("Quantity");
        cQty.setCellValueFactory(new PropertyValueFactory<>("qty")); cQty.setPrefWidth(100);
        TableColumn<TxRow,String> cB = new TableColumn<>("Borrow Date");
        cB.setCellValueFactory(new PropertyValueFactory<>("borrowAt")); cB.setPrefWidth(180);
        TableColumn<TxRow,String> cR = new TableColumn<>("Return Date");
        cR.setCellValueFactory(new PropertyValueFactory<>("returnAt")); cR.setPrefWidth(180);
        tableTx.getColumns().setAll(cSid,cItem,cQty,cB,cR);
        tableTx.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
    }
    private void initManageTable(){
        TableColumn<EquipmentRow,Integer> cCode = new TableColumn<>("Asset Code");
        cCode.setCellValueFactory(new PropertyValueFactory<>("id")); cCode.setPrefWidth(100);
        TableColumn<EquipmentRow,String> cName = new TableColumn<>("Equipment List");
        cName.setCellValueFactory(new PropertyValueFactory<>("name")); cName.setPrefWidth(260);
        TableColumn<EquipmentRow,Integer> cQty = new TableColumn<>("Quantity");
        cQty.setCellValueFactory(new PropertyValueFactory<>("total")); cQty.setPrefWidth(120);
        TableColumn<EquipmentRow,Integer> cAvail = new TableColumn<>("Available Quantity");
        cAvail.setCellValueFactory(new PropertyValueFactory<>("available")); cAvail.setPrefWidth(160);

        TableColumn<EquipmentRow, Void> cDel = new TableColumn<>("Delete Item");
        cDel.setCellFactory(col -> new TableCell<>() {
            private final Button btn = new Button("🗑");
            {
                btn.setOnAction(evt -> {
                    EquipmentRow row = getTableView().getItems().get(getIndex());
                    boolean ok = adminService.deleteItem("admin", row.getId());
                    if (ok) {
                        refreshEquipTable(currentManageKeyword);
                        refreshLogTable();
                    }
                });
                btn.setMaxWidth(Double.MAX_VALUE);
            }
            @Override protected void updateItem(Void v, boolean empty) {
                super.updateItem(v, empty);
                setGraphic(empty ? null : btn);
            }
        });
        cDel.setPrefWidth(120);

        manageTable.getColumns().setAll(cCode, cName, cQty, cAvail, cDel);
        manageTable.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
    }

    /* ---------- refreshers ---------- */
    private String currentManageKeyword = null;
    private void refreshEquipTable(String kw){
        currentManageKeyword = kw;
        var mapped = adminService.list(kw).stream().map(EquipmentRow::new).toList();
        equipRows.setAll(mapped);
        tableEquip.refresh();
        manageTable.refresh();
    }
    private void refreshLogTable(){
        var mapped = adminService.logs().stream().map(LogRow::new).toList();
        logRows.setAll(mapped);
        tableLog.refresh();
    }

    @Override public void start(Stage stage){
        seed();
        initEquipTable();
        initLogTable();
        initTxTable();
        initManageTable();
        refreshEquipTable(null);
        refreshLogTable();

        Tab tBorrow = borrowTab();
        Tab tManage = manageTab();   // ตามรูป
        Tab tRecord = recordTab();

        TabPane tabs = new TabPane(tBorrow, tManage, tRecord);
        tabs.setTabClosingPolicy(TabPane.TabClosingPolicy.UNAVAILABLE);

        BorderPane root = new BorderPane(tabs);
        root.setPadding(new Insets(12));
        Scene scene = new Scene(root, 1150, 660);
        stage.setTitle("Sports Equipment Borrow System — JavaFX (Single File)");
        stage.setScene(scene);
        stage.show();
    }

    /* ========== แท็บ 1: ยืม/คืนอุปกรณ์ ========== */
    private Tab borrowTab(){
        Tab t = new Tab("ยืม/คืนอุปกรณ์");
        VBox box = new VBox(12); box.setPadding(new Insets(12));

        TextField tfActor = new TextField(); tfActor.setPromptText("student ID / ผู้ใช้");
        TextField tfSearch = new TextField(); tfSearch.setPromptText("ค้นหาอุปกรณ์ (เว้นว่าง = ทั้งหมด)");
        Button btnSearch = new Button("ค้นหา");
        btnSearch.setOnAction(e -> refreshEquipTable(tfSearch.getText()));

        HBox searchRow = new HBox(8, tfActor, tfSearch, btnSearch);

        // Borrow
        TextField tfBid = new TextField(); tfBid.setPromptText("รหัสอุปกรณ์");
        TextField tfBqty = new TextField(); tfBqty.setPromptText("จำนวน");
        Button btnBorrow = new Button("ยืม");
        Label lbBorrow = new Label();
        btnBorrow.setOnAction(e -> {
            var actor = tfActor.getText().isBlank() ? "user" : tfActor.getText().trim();
            try{
                int id = Integer.parseInt(tfBid.getText().trim());
                int q  = Integer.parseInt(tfBqty.getText().trim());
                String msg = borrowService.borrow(actor,id,q);
                lbBorrow.setText(msg);
                if (!msg.startsWith("ยืมไม่ได้") && !msg.startsWith("ไม่พบ")) {
                    String itemName = borrowService.findItemName(id).orElse("#"+id);
                    addBorrowRecord(actor, itemName, q, LocalDateTime.now());
                }
                refreshEquipTable(tfSearch.getText()); refreshLogTable();
            }catch(Exception ex){ lbBorrow.setText("กรุณากรอกตัวเลขให้ถูกต้อง"); }
        });

        // Return
        TextField tfRid = new TextField(); tfRid.setPromptText("รหัสอุปกรณ์");
        TextField tfRqty = new TextField(); tfRqty.setPromptText("จำนวน");
        Button btnReturn = new Button("คืน");
        Label lbReturn = new Label();
        btnReturn.setOnAction(e -> {
            var actor = tfActor.getText().isBlank() ? "user" : tfActor.getText().trim();
            try{
                int id = Integer.parseInt(tfRid.getText().trim());
                int q  = Integer.parseInt(tfRqty.getText().trim());
                String msg = borrowService.giveBack(actor,id,q);
                lbReturn.setText(msg);
                if (msg.startsWith("คืนสำเร็จ")) {
                    String itemName = borrowService.findItemName(id).orElse("#"+id);
                    closeBorrowRecords(actor, itemName, q, LocalDateTime.now());
                }
                refreshEquipTable(tfSearch.getText()); refreshLogTable();
            }catch(Exception ex){ lbReturn.setText("กรุณากรอกตัวเลขให้ถูกต้อง"); }
        });

        StackPane tableArea = new StackPane(tableEquip);

        GridPane forms = new GridPane();
        forms.setHgap(8); forms.setVgap(8);
        forms.addRow(0, new Label("ยืม:"), tfBid, tfBqty, btnBorrow, lbBorrow);
        forms.addRow(1, new Label("คืน:"), tfRid, tfRqty, btnReturn, lbReturn);

        box.getChildren().addAll(searchRow, tableArea, forms);
        t.setContent(box);
        return t;
    }

    /* ========== แท็บ 2: จัดการอุปกรณ์กีฬา (UI ตามรูป) ========== */
    private Tab manageTab(){
        Tab t = new Tab("จัดการอุปกรณ์กีฬา");
        VBox box = new VBox(12); box.setPadding(new Insets(12));

        TextField tfSearch = new TextField(); tfSearch.setPromptText("บอล");
        Button btnFind = new Button("ค้นหา");
        btnFind.setOnAction(e -> refreshEquipTable(tfSearch.getText()));

        TextField tfNew = new TextField(); tfNew.setPromptText("เพิ่มรายการ");
        Spinner<Integer> spQty = new Spinner<>(1, 9999, 10);
        Button btnAdd = new Button("+ เพิ่ม");

        Label lbMsg = new Label();

        btnAdd.setOnAction(e -> {
            String name = tfNew.getText()==null? "" : tfNew.getText().trim();
            int qty = spQty.getValue();
            if (name.isBlank()){ lbMsg.setText("กรอกชื่ออุปกรณ์ก่อน"); return; }
            adminService.addItem("admin", "Ball", name, qty); // ใช้ Ball เป็นชนิดเริ่มต้น
            lbMsg.setText("เพิ่มแล้ว: "+name+" ("+qty+")");
            tfNew.clear(); spQty.getValueFactory().setValue(10);
            refreshEquipTable(currentManageKeyword);
            refreshLogTable();
        });

        HBox toolbar = new HBox(10, tfSearch, btnFind, tfNew, spQty, btnAdd, lbMsg);

        box.getChildren().addAll(toolbar, manageTable);
        t.setContent(box);
        return t;
    }

    /* ========== แท็บ 3: บันทึกการยืม-คืน ========== */
    private Tab recordTab(){
        Tab t = new Tab("บันทึกการยืม-คืน");
        VBox box = new VBox(12); box.setPadding(new Insets(12));

        TextField tfFind = new TextField(); tfFind.setPromptText("ค้นหา student ID");
        Button btnFind = new Button("ค้นหา");
        Button btnAll  = new Button("ดูทั้งหมด");
        btnFind.setOnAction(e -> {
            String kw = tfFind.getText()==null? "" : tfFind.getText().trim().toLowerCase(Locale.ROOT);
            tableTx.setItems(kw.isEmpty() ? txRows : txRows.filtered(r -> r.getStudentId().toLowerCase(Locale.ROOT).contains(kw)));
        });
        btnAll.setOnAction(e -> { tableTx.setItems(txRows); tfFind.clear(); });

        HBox search = new HBox(8, new Label("ค้นหารหัสนิสิต:"), tfFind, btnFind, btnAll);

        box.getChildren().addAll(search, tableTx);
        t.setContent(box);
        return t;
    }

    /* ===== บันทึกการยืม-คืน: จับคู่คืนกับยืม (รองรับคืนบางส่วน) ===== */
    private void addBorrowRecord(String studentId, String itemName, int qty, LocalDateTime when){
        txRows.add(new TxRow(studentId, itemName, qty, when, null));
        tableTx.refresh();
    }
    private void closeBorrowRecords(String studentId, String itemName, int qtyToReturn, LocalDateTime when){
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (int i = txRows.size()-1; i>=0 && qtyToReturn>0; i--){
            TxRow r = txRows.get(i);
            boolean same = r.getStudentId().equals(studentId) && r.getItem().equals(itemName);
            boolean open = r.isOpen();
            if (!same || !open) continue;

            int canClose = Math.min(qtyToReturn, r.getQty());
            LocalDateTime borrowAt = LocalDateTime.parse(r.getBorrowAt(), fmt);

            if (canClose == r.getQty()){
                r.setReturnAt(when);
                qtyToReturn -= canClose;
            }else{
                int remain = r.getQty() - canClose;
                TxRow stillOpen = new TxRow(r.getStudentId(), r.getItem(), remain, borrowAt, null);
                TxRow closed    = new TxRow(r.getStudentId(), r.getItem(), canClose, borrowAt, when);
                txRows.remove(i);
                txRows.add(i, closed);
                txRows.add(i, stillOpen);
                qtyToReturn -= canClose;
            }
        }
        tableTx.refresh();
    }

    public static void main(String[] args){ launch(args); }
}
