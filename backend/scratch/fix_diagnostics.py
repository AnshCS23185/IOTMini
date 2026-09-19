import os

filepath = r"D:\Project\PanelIQ\IOTMini\backend\app\routes\diagnostics.py"
with open(filepath, "r") as f:
    content = f.read()

# Fix history endpoint
content = content.replace(
    "query = db.query(Alert).join(Site).filter(Site.organization_id == current_user.organization_id)",
    """query = db.query(Alert)
    if current_user.role != "ADMIN":
        query = query.join(Site).filter(Site.organization_id == current_user.organization_id)"""
)

# Fix analytics endpoint
content = content.replace(
    "base_query = db.query(Alert).join(Site).filter(Site.organization_id == current_user.organization_id)",
    """base_query = db.query(Alert)
    if current_user.role != "ADMIN":
        base_query = base_query.join(Site).filter(Site.organization_id == current_user.organization_id)"""
)

# Fix trend endpoint
content = content.replace(
    """    alerts = db.query(Alert).join(Site).filter(
        Site.organization_id == current_user.organization_id,
        Alert.first_detected_at >= cutoff
    ).all()""",
    """    alerts_query = db.query(Alert)
    if current_user.role != "ADMIN":
        alerts_query = alerts_query.join(Site).filter(Site.organization_id == current_user.organization_id)
        
    alerts_query = alerts_query.filter(Alert.first_detected_at >= cutoff)
    
    if site_id:
        alerts_query = alerts_query.filter(Alert.site_id == site_id)
        
    alerts = alerts_query.all()"""
)

with open(filepath, "w") as f:
    f.write(content)
print("Fixed successfully!")
