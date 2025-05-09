import React, { useEffect, useState } from "react";
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { toast } from "sonner";

import useUserStore from "@/stores/userStore";

import TicketWidget from "../../../components/TicketWidget";
import { WIDGET_TYPES } from "../../../constants/tickets";
import {
  Assignee,
  LayoutStorage,
  Row,
  Tab,
  TicketForm,
  TimeEntry,
  Widget,
} from "../../../types/tickets";
import { saveToLS } from "../../../utils/ticketUtils";
import { generateResponsiveLayouts } from "../utils/layoutUtils";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface TicketDialogProps {
  viewDialogOpen: boolean;
  setViewDialogOpen: (open: boolean) => void;
  currentTicket: Row | null;
  currentTicketPreset: string | undefined;
  setCurrentTicketPreset: (preset: string | undefined) => void;
  ticketForm: TicketForm;
  setTicketForm: (form: TicketForm) => void;
  uploadedImages: string[];
  setUploadedImages: (images: string[]) => void;
  assignees: Assignee[];
  setAssignees: (assignees: Assignee[]) => void;
  timeEntries: TimeEntry[];
  setTimeEntries: (entries: TimeEntry[]) => void;
  isEditLayoutMode: boolean;
  setIsEditLayoutMode: (isEdit: boolean) => void;
  showAssigneeForm: boolean;
  setShowAssigneeForm: (show: boolean) => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  widgets: Widget[];
  setWidgets: (widgets: Widget[]) => void;
  widgetLayouts: Layouts;
  setWidgetLayouts: (layouts: Layouts) => void;
  activeTab: string;
  tabs: Tab[];
  handleSaveTicketChanges: () => void;
  handleFieldChange: (field: string, value: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  addWidget: (type: string, ticket: Row) => void;
  removeWidget: (id: string) => void;
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  updateWidgetTitle: (widgetId: string, newTitle: string) => void;
  handleAddAssignee: () => void;
  handleRemoveAssignee: (id: string) => void;
  handleUpdateAssignee: (id: string, field: string, value: string) => void;
  handleAddTimeEntry: (assigneeId: string) => void;
  handleRemoveTimeEntry: (id: string) => void;
  handleUpdateTimeEntry: (id: string, field: string, value: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  markAssigneeCompleted: (assigneeId: string, completed: boolean | string) => void;
  modifiedTimeEntries: Set<string>;
}

// Component for Header section
const DialogHeader = ({
  currentTicket,
  currentUser,
  isEditLayoutMode,
  setIsEditLayoutMode,
  handleResetLayout,
  addWidget,
  handleDialogClose,
}: {
  currentTicket: Row;
  currentUser: any;
  isEditLayoutMode: boolean;
  setIsEditLayoutMode: (isEdit: boolean) => void;
  handleResetLayout: () => void;
  addWidget: (type: string, ticket: Row) => void;
  handleDialogClose: () => void;
}) => (
  <div className="border-b p-4 flex items-center justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        Ticket Details (ID: {currentTicket.cells["col-1"]})
      </h2>
    </div>
    <div className="flex items-center space-x-3">
      {/* Only show Edit Layout toggle if not a user role */}
      {currentUser?.role !== "user" && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-600">Edit Layout</span>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEditLayoutMode ? "bg-blue-600" : "bg-neutral-200"}`}
            onClick={() => setIsEditLayoutMode(!isEditLayoutMode)}
          >
            <span
              className={`${
                isEditLayoutMode ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>
      )}

      {/* Update Reset Layout button */}
      {isEditLayoutMode && currentUser?.role !== "user" && (
        <button
          onClick={handleResetLayout}
          className="mr-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-sm hover:bg-red-100"
        >
          Reset Layout
        </button>
      )}

      {/* Add widget button */}
      {isEditLayoutMode && currentUser?.role !== "user" && (
        <AddWidgetDropdown currentTicket={currentTicket} addWidget={addWidget} />
      )}

      <button onClick={() => handleDialogClose()} className="text-neutral-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
);

// Component for Add Widget Dropdown
const AddWidgetDropdown = ({ currentTicket, addWidget }: { currentTicket: Row; addWidget: (type: string, ticket: Row) => void }) => (
  <div className="relative">
    <button
      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center"
      onClick={(e) => {
        const dropdown = document.getElementById("widget-dropdown");
        if (dropdown) {
          dropdown.classList.toggle("hidden");
          // Position the dropdown below the button
          const rect = e.currentTarget.getBoundingClientRect();
          dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
          dropdown.style.left = `${rect.left + window.scrollX}px`;
        }
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      <span>Add Widget</span>
    </button>

    <div
      id="widget-dropdown"
      className="fixed hidden rounded-md border border-neutral-200 bg-white shadow-lg z-50 w-48 max-h-80 overflow-y-auto"
    >
      <WidgetDropdownContent currentTicket={currentTicket} addWidget={addWidget} dropdownId="widget-dropdown" />
    </div>
  </div>
);

// Reusable Widget Dropdown Content
const WidgetDropdownContent = ({ 
  currentTicket, 
  addWidget, 
  dropdownId 
}: { 
  currentTicket: Row; 
  addWidget: (type: string, ticket: Row) => void; 
  dropdownId: string 
}) => (
  <div className="py-1">
    <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
      Groups
    </div>
    {/* Widget type buttons for group widgets */}
    {[
      { type: WIDGET_TYPES.DETAILS, label: "Ticket Details" },
      { type: WIDGET_TYPES.ASSIGNEES, label: "Team Members" },
      { type: WIDGET_TYPES.TIME_ENTRIES, label: "Time Entries" },
      { type: WIDGET_TYPES.ATTACHMENTS, label: "Attachments" },
      { type: WIDGET_TYPES.NOTES, label: "Notes" },
    ].map((item) => (
      <button
        key={item.type}
        className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
        onClick={() => {
          addWidget(item.type, currentTicket);
          document
            .getElementById(dropdownId)
            ?.classList.add("hidden");
        }}
      >
        {item.label}
      </button>
    ))}

    <div className="my-1 border-t border-neutral-200"></div>
    <div className="px-4 py-1 text-xs font-semibold text-neutral-500 uppercase">
      Individual Fields
    </div>

    {/* Widget type buttons for field widgets */}
    {[
      { type: WIDGET_TYPES.FIELD_STATUS, label: "Status Field" },
      {
        type: WIDGET_TYPES.FIELD_CUSTOMER_NAME,
        label: "Customer Name Field",
      },
      {
        type: WIDGET_TYPES.FIELD_DATE_CREATED,
        label: "Date Created Field",
      },
      {
        type: WIDGET_TYPES.FIELD_LAST_MODIFIED,
        label: "Last Modified Field",
      },
      {
        type: WIDGET_TYPES.FIELD_BILLABLE_HOURS,
        label: "Billable Hours Field",
      },
      {
        type: WIDGET_TYPES.FIELD_TOTAL_HOURS,
        label: "Total Hours Field",
      },
      {
        type: WIDGET_TYPES.FIELD_DESCRIPTION,
        label: "Description Field",
      },
    ].map((item) => (
      <button
        key={item.type}
        className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
        onClick={() => {
          addWidget(item.type, currentTicket);
          document
            .getElementById(dropdownId)
            ?.classList.add("hidden");
        }}
      >
        {item.label}
      </button>
    ))}
  </div>
);

// Loading Indicator
const LoadingIndicator = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
      <p>Loading Engineering layout...</p>
    </div>
  </div>
);

// EmptyWidgetState component
const EmptyWidgetState = ({ currentTicket, addWidget }: { currentTicket: Row; addWidget: (type: string, ticket: Row) => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
    <div className="p-6 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 max-w-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 mx-auto text-neutral-400 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <h3 className="text-lg font-medium text-neutral-700 mb-2">
        Customize Your Ticket Layout
      </h3>
      <p className="text-neutral-500 mb-6">
        This ticket doesn't have any widgets yet. Add widgets to
        create your custom layout.
      </p>
      <div className="flex justify-center">
        <div className="relative">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center"
            onClick={(e) => {
              const dropdown = document.getElementById(
                "customize-widget-dropdown",
              );
              if (dropdown) {
                dropdown.classList.toggle("hidden");
                // Position the dropdown below the button
                const rect = e.currentTarget.getBoundingClientRect();
                dropdown.style.top = `${rect.bottom + window.scrollY + 8}px`;
                dropdown.style.left = `${rect.left + window.scrollX}px`;
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Widget
          </button>

          <div
            id="customize-widget-dropdown"
            className="fixed hidden rounded-md border border-neutral-200 bg-white shadow-lg z-50 w-48 text-left max-h-80 overflow-y-auto"
          >
            <WidgetDropdownContent 
              currentTicket={currentTicket} 
              addWidget={addWidget} 
              dropdownId="customize-widget-dropdown" 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// WidgetGrid component for shared grid layout code
const WidgetGrid = ({
  widgets,
  isEditLayoutMode,
  handleLayoutChange,
  activeTab,
  tabs,
  currentTicket,
  ticketForm,
  handleFieldChange,
  toggleWidgetCollapse,
  removeWidget,
  updateWidgetTitle,
  assignees,
  timeEntries,
  uploadedImages,
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  handleRemoveTimeEntry,
  handleUpdateTimeEntry,
  setTicketForm,
  handleImageUpload,
  setUploadedImages,
  showAssigneeForm,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee,
  markAssigneeCompleted,
}: {
  widgets: Widget[];
  isEditLayoutMode: boolean;
  handleLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  activeTab: string;
  tabs: Tab[];
  currentTicket: Row;
  ticketForm: TicketForm;
  handleFieldChange: (field: string, value: string) => void;
  toggleWidgetCollapse: (widgetId: string) => void;
  removeWidget: (id: string) => void;
  updateWidgetTitle: (widgetId: string, newTitle: string) => void;
  assignees: Assignee[];
  timeEntries: TimeEntry[];
  uploadedImages: string[];
  handleAddAssignee: () => void;
  handleRemoveAssignee: (id: string) => void;
  handleUpdateAssignee: (id: string, field: string, value: string) => void;
  handleAddTimeEntry: (assigneeId: string) => void;
  handleRemoveTimeEntry: (id: string) => void;
  handleUpdateTimeEntry: (id: string, field: string, value: string) => void;
  setTicketForm: (form: TicketForm) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setUploadedImages: (images: string[]) => void;
  showAssigneeForm: boolean;
  setShowAssigneeForm: (show: boolean) => void;
  newAssignee: Assignee;
  setNewAssignee: (assignee: Assignee) => void;
  markAssigneeCompleted: (assigneeId: string, completed: boolean | string) => void;
}) => (
  <div className="w-full relative">
    <ResponsiveGridLayout
      className={`layout ${!isEditLayoutMode ? "non-editable" : ""}`}
      layouts={generateResponsiveLayouts(
        widgets,
        activeTab,
        tabs,
        currentTicket,
      )}
      breakpoints={{
        lg: 1200,
        md: 996,
        sm: 768,
        xs: 480,
        xxs: 320,
      }}
      cols={{ lg: 12, md: 12, sm: 12, xs: 6, xxs: 4 }}
      rowHeight={40}
      onLayoutChange={handleLayoutChange}
      isDraggable={isEditLayoutMode}
      isResizable={isEditLayoutMode}
      margin={[8, 8]}
      containerPadding={[0, 0]}
      preventCollision={false}
      compactType="vertical"
      useCSSTransforms={true}
      draggableHandle=".react-grid-dragHandle"
      // Force key refresh when widgets change to ensure layout is applied
      key={`grid-${widgets.map((w) => w.id).join("-")}`}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={`widget-container ${!isEditLayoutMode ? "static pointer-events-auto" : ""}`}
        >
          <TicketWidget
            widget={widget}
            ticketForm={ticketForm}
            currentTicket={currentTicket}
            handleFieldChange={handleFieldChange}
            toggleWidgetCollapse={toggleWidgetCollapse}
            removeWidget={removeWidget}
            updateWidgetTitle={updateWidgetTitle}
            assignees={assignees}
            timeEntries={timeEntries}
            uploadedImages={uploadedImages}
            handleAddAssignee={handleAddAssignee}
            handleRemoveAssignee={handleRemoveAssignee}
            handleUpdateAssignee={handleUpdateAssignee}
            handleAddTimeEntry={handleAddTimeEntry}
            handleRemoveTimeEntry={handleRemoveTimeEntry}
            handleUpdateTimeEntry={handleUpdateTimeEntry}
            setTicketForm={setTicketForm}
            handleImageUpload={handleImageUpload}
            setUploadedImages={setUploadedImages}
            showAssigneeForm={showAssigneeForm}
            setShowAssigneeForm={setShowAssigneeForm}
            newAssignee={newAssignee}
            setNewAssignee={setNewAssignee}
            isEditMode={isEditLayoutMode}
            markAssigneeCompleted={markAssigneeCompleted}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  </div>
);

// Footer component
const DialogFooter = ({ 
  handleDialogClose, 
  handleSaveTicketChanges 
}: { 
  handleDialogClose: () => void;
  handleSaveTicketChanges: () => void;
}) => (
  <div className="border-t p-4 flex justify-end space-x-3">
    <button
      onClick={() => handleDialogClose()}
      className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
    >
      Cancel
    </button>
    <button
      onClick={() => handleSaveTicketChanges()}
      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
    >
      Save Changes
    </button>
  </div>
);

const TicketDialog: React.FC<TicketDialogProps> = ({
  viewDialogOpen,
  setViewDialogOpen,
  currentTicket,
  currentTicketPreset,
  setCurrentTicketPreset,
  ticketForm,
  setTicketForm,
  uploadedImages,
  setUploadedImages,
  assignees,
  timeEntries,
  isEditLayoutMode,
  setIsEditLayoutMode,
  showAssigneeForm,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee,
  widgets,
  setWidgets,
  setWidgetLayouts,
  activeTab,
  tabs,
  handleSaveTicketChanges,
  handleFieldChange,
  toggleWidgetCollapse,
  addWidget,
  removeWidget,
  onLayoutChange,
  updateWidgetTitle,
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  handleRemoveTimeEntry,
  handleUpdateTimeEntry,
  handleImageUpload,
  markAssigneeCompleted,
  modifiedTimeEntries,
}) => {
  const { currentUser } = useUserStore();

  // Add a function to handle layout reset
  const handleResetLayout = () => {
    // Find current tab to determine if it has Engineering preset
    const currentTabData = tabs.find((tab) => tab.id === activeTab);
    const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

    if (hasEngineeringPreset) {
      // Clear saved Engineering layouts
      saveToLS<{ widgets: Widget[]; layouts: Record<string, never> }>(
        "engineering-layouts",
        { widgets: [], layouts: {} },
      );
      console.log("Reset Engineering widget layout");
    } else if (currentTicket) {
      // Clear tab-specific layouts
      const ticketId = currentTicket.cells["col-1"];
      const tabSpecificLayoutKey = `tab-${activeTab}`;
      saveToLS<{ widgets: Widget[]; layouts: Record<string, never> }>(
        tabSpecificLayoutKey,
        { widgets: [], layouts: {} },
      );
      console.log(
        "Reset tab-specific layout for tab",
        activeTab,
        "and ticket:",
        ticketId,
      );
    }

    // First clear existing widgets and layouts
    setWidgets([]);
    setWidgetLayouts({});

    // Widgets will be re-added by the useEffect
  };

  // Add a useEffect to initialize widgets when needed
  useEffect(() => {
    // Only run this effect when the dialog is open and there's a current ticket
    if (viewDialogOpen && currentTicket) {
      // Check if the Engineering preset is applied and we need to add widgets
      const hasEngineeringPreset = currentTicketPreset === "Engineering";
      
      if (hasEngineeringPreset && widgets.length === 0) {
        console.log("Adding default widgets for Engineering preset in TicketDialog");
        
        // Add engineering preset widgets
        addWidget(WIDGET_TYPES.FIELD_STATUS, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_CUSTOMER_NAME, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_DATE_CREATED, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_LAST_MODIFIED, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_BILLABLE_HOURS, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_TOTAL_HOURS, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_DESCRIPTION, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_ASSIGNEE_TABLE, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_TIME_ENTRIES_TABLE, currentTicket);
        addWidget(WIDGET_TYPES.FIELD_ATTACHMENTS_GALLERY, currentTicket);
      }
    }
  }, [viewDialogOpen, currentTicket, currentTicketPreset, widgets.length, addWidget]);

  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
    console.log("Layout changed:", currentLayout.length, "items in current layout");

    // Only update if there are actual layouts
    if (currentLayout.length > 0) {
      // Save the user-modified layouts using the Zustand store
      setWidgetLayouts(allLayouts);

      // Pass the layout change to the store
      onLayoutChange(currentLayout, allLayouts);

      // Close any open widget dropdowns
      const dropdowns = [
        document.getElementById("widget-dropdown"),
        document.getElementById("customize-widget-dropdown"),
      ];

      dropdowns.forEach((dropdown) => {
        if (dropdown && !dropdown.classList.contains("hidden")) {
          dropdown.classList.add("hidden");
        }
      });

      // Also save to localStorage with the complete state
      if (currentTicket && widgets.length > 0) {
        const completeState = {
          widgets: widgets,
          layouts: allLayouts,
        };

        // Find current tab to determine if it has Engineering preset
        const currentTabData = tabs.find((tab) => tab.id === activeTab);
        const hasEngineeringPreset = currentTabData?.appliedPreset === "Engineering";

        // Use appropriate storage key based on tab type
        const ticketId = currentTicket.cells["col-1"];
        if (hasEngineeringPreset) {
          // Save Engineering preset layouts to Engineering-specific key
          saveToLS<LayoutStorage>("engineering-layouts", completeState);
          console.log("Saved Engineering layout changes for ticket:", ticketId);
        } else {
          // Save non-Engineering layouts to tab-specific key
          const tabSpecificLayoutKey = `tab-${activeTab}`;
          saveToLS<LayoutStorage>(tabSpecificLayoutKey, completeState);
          console.log(
            "Saved tab-specific layout changes for tab",
            activeTab,
            "and ticket:",
            ticketId,
          );
        }
      }
    }
  };

  // Add a function to handle dialog close that saves changes
  const handleDialogClose = async () => {
    // If there are unsaved changes, save them first
    if (modifiedTimeEntries.size > 0) {
      await handleSaveTicketChanges();
    }
    
    // Close the dialog
    setViewDialogOpen(false);
    
    // Reset the current ticket preset
    setCurrentTicketPreset(undefined);
  };

  if (!viewDialogOpen || !currentTicket) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/30 p-4 overflow-y-auto"
      onClick={() => handleDialogClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        <DialogHeader 
          currentTicket={currentTicket}
          currentUser={currentUser}
          isEditLayoutMode={isEditLayoutMode}
          setIsEditLayoutMode={setIsEditLayoutMode}
          handleResetLayout={handleResetLayout}
          addWidget={addWidget}
          handleDialogClose={handleDialogClose}
        />

        <div className="flex-1 overflow-auto p-6">
          {(() => {
            // Use the stored ticket preset directly instead of checking tab data
            const hasEngineeringPreset = currentTicketPreset === "Engineering";

            if (hasEngineeringPreset) {
              // Check if we have widgets for the Engineering preset
              if (widgets.length === 0) {
                return <LoadingIndicator />;
              }
              
              // Show widget grid layout if preset is "Engineering"
              return (
                <WidgetGrid
                  widgets={widgets}
                  isEditLayoutMode={isEditLayoutMode}
                  handleLayoutChange={handleLayoutChange}
                  activeTab={activeTab}
                  tabs={tabs}
                  currentTicket={currentTicket}
                  ticketForm={ticketForm}
                  handleFieldChange={handleFieldChange}
                  toggleWidgetCollapse={toggleWidgetCollapse}
                  removeWidget={removeWidget}
                  updateWidgetTitle={updateWidgetTitle}
                  assignees={assignees}
                  timeEntries={timeEntries}
                  uploadedImages={uploadedImages}
                  handleAddAssignee={handleAddAssignee}
                  handleRemoveAssignee={handleRemoveAssignee}
                  handleUpdateAssignee={handleUpdateAssignee}
                  handleAddTimeEntry={handleAddTimeEntry}
                  handleRemoveTimeEntry={handleRemoveTimeEntry}
                  handleUpdateTimeEntry={handleUpdateTimeEntry}
                  setTicketForm={setTicketForm}
                  handleImageUpload={handleImageUpload}
                  setUploadedImages={setUploadedImages}
                  showAssigneeForm={showAssigneeForm}
                  setShowAssigneeForm={setShowAssigneeForm}
                  newAssignee={newAssignee}
                  setNewAssignee={setNewAssignee}
                  markAssigneeCompleted={markAssigneeCompleted}
                />
              );
            } else {
              // For non-Engineering preset tabs (or if no preset), show the "Customize" view
              return (
                <div className="h-full flex flex-col">
                  {widgets.length === 0 ? (
                    <EmptyWidgetState 
                      currentTicket={currentTicket} 
                      addWidget={addWidget} 
                    />
                  ) : (
                    // Display added widgets with a similar layout to the Engineering preset
                    <div className="w-full relative p-4">
                      <WidgetGrid
                        widgets={widgets}
                        isEditLayoutMode={isEditLayoutMode}
                        handleLayoutChange={handleLayoutChange}
                        activeTab={activeTab}
                        tabs={tabs}
                        currentTicket={currentTicket}
                        ticketForm={ticketForm}
                        handleFieldChange={handleFieldChange}
                        toggleWidgetCollapse={toggleWidgetCollapse}
                        removeWidget={removeWidget}
                        updateWidgetTitle={updateWidgetTitle}
                        assignees={assignees}
                        timeEntries={timeEntries}
                        uploadedImages={uploadedImages}
                        handleAddAssignee={handleAddAssignee}
                        handleRemoveAssignee={handleRemoveAssignee}
                        handleUpdateAssignee={handleUpdateAssignee}
                        handleAddTimeEntry={handleAddTimeEntry}
                        handleRemoveTimeEntry={handleRemoveTimeEntry}
                        handleUpdateTimeEntry={handleUpdateTimeEntry}
                        setTicketForm={setTicketForm}
                        handleImageUpload={handleImageUpload}
                        setUploadedImages={setUploadedImages}
                        showAssigneeForm={showAssigneeForm}
                        setShowAssigneeForm={setShowAssigneeForm}
                        newAssignee={newAssignee}
                        setNewAssignee={setNewAssignee}
                        markAssigneeCompleted={markAssigneeCompleted}
                      />
                    </div>
                  )}
                </div>
              );
            }
          })()}
        </div>

        <DialogFooter 
          handleDialogClose={handleDialogClose}
          handleSaveTicketChanges={handleSaveTicketChanges} 
        />
      </div>
    </div>
  );
};

export default TicketDialog;
