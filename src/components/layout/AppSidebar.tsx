import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllowedNavSections } from "@/lib/navigation";
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Collapse,
} from "@mui/material";

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export default function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const navSections = getAllowedNavSections(user);

  const drawerWidth = collapsed ? 72 : 256;

  return (
      <Drawer
       variant="permanent"
       sx={{
         width: drawerWidth,
         flexShrink: 0,
         "& .MuiDrawer-paper": {
           width: drawerWidth,
           boxSizing: "border-box",
           background: "linear-gradient(180deg, #024023 0%, #1a5f2a 40%, #024023 80%)",
           borderRight: "1px solid rgba(0, 122, 61, 0.2)",
           overflowX: "hidden",
           transition: "width 0.3s ease",
           display: "flex",
           flexDirection: "column",
           boxShadow: "0 0 30px rgba(0, 0, 0, 0.3)",
           backdropFilter: "saturate(180%) blur(20px)",
         },
       }}
     >
       <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Logo Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2.5,
            borderBottom: "1px solid rgba(242, 169, 0, 0.2)",
            minHeight: 72,
            background: "linear-gradient(90deg, transparent, rgba(242, 169, 0, 0.05), transparent)",
          }}
        >
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(242, 169, 0, 0.2) 0%, rgba(242, 169, 0, 0.1) 100%)",
              boxShadow: "0 0 20px rgba(242, 169, 0, 0.3)",
              overflow: "hidden",
              flexShrink: 0,
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: "0 0 30px rgba(242, 169, 0, 0.5)",
              }
            }}
          >
            <img src="/logo.png" alt="UNZA Clinic logo" style={{ height: 36, width: 36, objectFit: "contain" }} />
          </Box>
          {!collapsed && (
            <Box sx={{ overflow: "hidden", opacity: 1, transition: "opacity 0.2s" }}>
              <Typography variant="h5" fontWeight={800} sx={{ fontSize: "1rem", color: "white", letterSpacing: "0.05em", textShadow: "0 0 10px rgba(242, 169, 0, 0.5)" }}>
                UNZA Clinic
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.625rem", color: "#F2A900", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Health Management System
              </Typography>
            </Box>
          )}
        </Box>

        {/* Navigation */}
        <Box sx={{ flex: 1, overflowY: "auto", py: 2, px: 1 }}>
          {navSections.map((section) => (
            <Box key={section.title} sx={{ mb: 3 }}>
              {!collapsed && (
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "rgba(144, 216, 146, 0.7)",
                    display: "block",
                    mb: 1,
                  }}
                >
                  {section.title}
                </Typography>
              )}
              <List dense disablePadding>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to ||
                    (item.to !== "/" && location.pathname.startsWith(item.to));
                  return (
                    <ListItemButton
                      key={item.to}
                      component={NavLink}
                      to={item.to}
                      sx={{
                        borderRadius: "8px",
                        mx: 0.5,
                        my: 0.25,
                        position: "relative",
                        overflow: "hidden",
                        color: isActive ? "white" : "rgba(200, 245, 200, 0.8)",
                        backgroundColor: isActive ? "rgba(0, 122, 61, 0.4)" : "transparent",
                        "&:hover": {
                          backgroundColor: "rgba(0, 122, 61, 0.25)",
                          color: "white",
                        },
                        transition: "all 0.2s ease",
                        "&::before": isActive ? {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: "3px",
                          background: "linear-gradient(180deg, #F2A900 0%, #F2A900 100%)",
                        } : undefined,
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: isActive ? "#F2A900" : "rgba(200, 245, 200, 0.7)",
                          "&:hover": { color: "#F2A900" },
                          transition: "color 0.2s ease",
                        }}
                      >
                        <item.icon className="h-4.5 w-4.5" />
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: {
                              fontWeight: 500,
                              fontSize: "0.8125rem",
                              noWrap: true,
                            }
                          }}
                        />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Collapse Button */}
        <Divider sx={{ borderColor: "rgba(0, 122, 61, 0.3)", mx: 1 }} />
        <Box sx={{ p: 1 }}>
          <ListItemButton
            onClick={() => onCollapsedChange(!collapsed)}
            sx={{
              borderRadius: "8px",
              color: "rgba(200, 245, 200, 0.8)",
              "&:hover": {
                backgroundColor: "rgba(0, 122, 61, 0.25)",
                color: "white",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: "rgba(200, 245, 200, 0.7)",
                "&:hover": { color: "#F2A900" },
              }}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Collapse"
                slotProps={{
                  primary: {
                    fontWeight: 500,
                    fontSize: "0.8125rem",
                  }
                }}
              />
            )}
          </ListItemButton>
        </Box>
       </Box>
     </Drawer>
  );
}
